import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, RepeatUnit } from './entities/task.entity';
import { Category, CategoryDocument } from '../categories/entities/category.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  // 1. TẠO CÔNG VIỆC MỚI
  async create(userId: string, createTaskDto: CreateTaskDto): Promise<Task> {
    const { categoryName, ...taskData } = createTaskDto;
    let finalCategoryId: Types.ObjectId | undefined = undefined;

    // Xử lý Category Find-or-Create
    if (categoryName) {
      let category = await this.categoryModel.findOne({
        userId: new Types.ObjectId(userId),
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
      });

      if (!category) {
        category = await this.categoryModel.create({
          name: categoryName,
          userId: new Types.ObjectId(userId),
          color: '#8B5CF6' 
        });
      }
      finalCategoryId = category._id as Types.ObjectId;
    }

    // Nếu là Master Task, lưu startDate là ngày dueDate ban đầu
    const startDate = taskData.isMaster ? new Date(taskData.dueDate) : undefined;

    const newTask = new this.taskModel({
      ...taskData,
      startDate,
      userId: new Types.ObjectId(userId),
      categoryId: finalCategoryId
    });
    
    return newTask.save();
  }

  // 2. LẤY DANH SÁCH & SINH TASK ẢO TRÊN LỊCH (Hỗ trợ Duration Range)
  async findAll(
      userId: string, 
      startDateStr?: string, 
      endDateStr?: string, 
      isCompletedStr?: string,
      isImportantStr?: string,
      isOverdueStr?: string
    ): Promise<any[]> {
      // Parser filters
      const isCompletedFilter = isCompletedStr !== undefined ? isCompletedStr === 'true' : undefined;
      const isImportantFilter = isImportantStr !== undefined ? isImportantStr === 'true' : undefined;
      const isOverdueFilter = isOverdueStr !== undefined ? isOverdueStr === 'true' : undefined;

      // A. NẾU KHÔNG CÓ TRUYỀN NGÀY (Chỉ query DB lấy list bình thường)
      if (!startDateStr) {
        const query: any = { userId: new Types.ObjectId(userId), isMaster: false };
        
        if (isCompletedFilter !== undefined) query.isCompleted = isCompletedFilter;
        if (isImportantFilter !== undefined) query.isImportant = isImportantFilter;
        
        if (isOverdueFilter) {
          query.isCompleted = false; // Quá hạn luôn đi kèm điều kiện là chưa làm xong
          query.dueDate = { $lt: new Date() };
        }

        return this.taskModel.find(query).populate('categoryId', 'name color').sort({ dueDate: 1 }).lean().exec();
      }

      // B. NẾU CÓ RANGE TIME (Xử lý tính toán sinh Task ảo lặp lại)
      const startRange = new Date(startDateStr);
      startRange.setUTCHours(0, 0, 0, 0);
      
      const endRange = endDateStr ? new Date(endDateStr) : new Date(startDateStr);
      endRange.setUTCHours(23, 59, 59, 999);

      // B1: Lấy TẤT CẢ task THẬT trong khoảng thời gian (CHƯA LỌC ĐIỀU KIỆN)
      const realTasksQuery: any = {
        userId: new Types.ObjectId(userId),
        isMaster: false,
        dueDate: { $gte: startRange, $lte: endRange }
      };
      
      const allRealTasksInRange = await this.taskModel.find(realTasksQuery).populate('categoryId', 'name color').lean().exec();

      // Lọc task thật theo điều kiện
      let realTasksToReturn = allRealTasksInRange;
      
      if (isCompletedFilter !== undefined) {
        realTasksToReturn = realTasksToReturn.filter(t => t.isCompleted === isCompletedFilter);
      }
      if (isImportantFilter !== undefined) {
        realTasksToReturn = realTasksToReturn.filter(t => t.isImportant === isImportantFilter);
      }
      if (isOverdueFilter) {
        const now = new Date();
        realTasksToReturn = realTasksToReturn.filter(t => !t.isCompleted && new Date(t.dueDate) < now);
      }

      // B2: Lấy các Master Task còn hiệu lực
      const masterTasks = await this.taskModel.find({
        userId: new Types.ObjectId(userId),
        isMaster: true,
        startDate: { $lte: endRange } 
      }).populate('categoryId', 'name color').lean().exec();

      const virtualTasks: any[] = [];

      // B3: Tính toán nội suy ảo qua từng ngày trong Range
      let currentDate = new Date(startRange);
      
      while (currentDate <= endRange) {
        for (const master of masterTasks) {
          const isRealizedOnThisDay = allRealTasksInRange.some(rt => 
            rt.masterId?.toString() === master._id.toString() &&
            new Date(rt.dueDate).getUTCDate() === currentDate.getUTCDate() &&
            new Date(rt.dueDate).getUTCMonth() === currentDate.getUTCMonth() &&
            new Date(rt.dueDate).getUTCFullYear() === currentDate.getUTCFullYear()
          );

          if (isRealizedOnThisDay) continue;

          if (this.checkIfDateMatchesRule(currentDate, master)) {
            const virtualDueDate = new Date(currentDate);
            const originalTime = new Date(master.dueDate);
            virtualDueDate.setUTCHours(originalTime.getUTCHours(), originalTime.getUTCMinutes(), 0, 0);

          const virtualTask = {
            _id: `virtual_${master._id}_${currentDate.getTime()}`, 
            title: master.title,
            description: master.description,
            dueDate: virtualDueDate,
            isCompleted: false, // Task ảo mặc định luôn là false
            isImportant: master.isImportant ?? false, 
            categoryId: master.categoryId,
            isVirtual: true, 
            masterId: master._id 
          };

          // Bộ lọc cho Task Ảo
          let keep = true;
          
          if (isCompletedFilter !== undefined && virtualTask.isCompleted !== isCompletedFilter) keep = false;
          if (isImportantFilter !== undefined && virtualTask.isImportant !== isImportantFilter) keep = false;
          if (isOverdueFilter) {
            const now = new Date();
            if (virtualTask.isCompleted || virtualTask.dueDate >= now) {
              keep = false;
            }
          }

          if (keep) {
            virtualTasks.push(virtualTask);
          }
        }
      }
      
      // Tăng lên 1 ngày để quét tiếp
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return [...realTasksToReturn, ...virtualTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // 3. ĐÁNH DẤU QUAN TRỌNG (HỖ TRỢ TỰ ĐỘNG TÁCH TASK ẢO)
  async markAsImportant(id: string, userId: string, isImportant: boolean): Promise<Task> {
    if (id.startsWith('virtual_')) {
      const parts = id.split('_');
      if (parts.length !== 3) {
        throw new BadRequestException('ID Task ảo không hợp lệ');
      }
      
      const masterId = parts[1];
      const timestamp = parseInt(parts[2], 10);
      const dueDate = new Date(timestamp);

      const masterTask = await this.taskModel.findById(masterId).exec();
      if (!masterTask || masterTask.userId.toString() !== userId) {
        throw new NotFoundException('Quy tắc lặp lại không tồn tại');
      }

      const realTask = new this.taskModel({
        title: masterTask.title,
        description: masterTask.description,
        dueDate: dueDate,
        isCompleted: false, 
        isImportant: isImportant, 
        isMaster: false,
        masterId: masterTask._id,
        categoryId: masterTask.categoryId,
        userId: new Types.ObjectId(userId),
      });

      return realTask.save();
    } 
    else {
      const updatedTask = await this.taskModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { isImportant } },
        { new: true }
      ).populate('categoryId', 'name color').exec();

      if (!updatedTask) {
        throw new NotFoundException('Không tìm thấy công việc để cập nhật');
      }
      return updatedTask;
    }
  }

  // 4. KIỂM TRA CHU KỲ (THUẬT TOÁN)
  public checkIfDateMatchesRule(targetDate: Date, master: any): boolean {
    const start = new Date(master.startDate);
    start.setUTCHours(0,0,0,0);
    const target = new Date(targetDate);
    target.setUTCHours(0,0,0,0);
    
    // 1. Kiểm tra ngày bắt đầu
    if (target < start) return false;

    // 2. Kiểm tra ngày kết thúc chuỗi lặp
    if (master.endRepeatDate) {
      const endRepeat = new Date(master.endRepeatDate);
      endRepeat.setUTCHours(23, 59, 59, 999); 
      if (target > endRepeat) return false;
    }

    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    switch (master.repeatUnit) {
      case RepeatUnit.DAILY:
        return diffDays % master.repeatInterval === 0;
      
      case RepeatUnit.FIXED_DAYS: {
        const targetDayOfWeek = target.getUTCDay(); // 0 là CN, 1 là T2...
        if (master.repeatDays && master.repeatDays.length > 0) {
          return master.repeatDays.includes(targetDayOfWeek);
        }
        return false;
      }
      
      case RepeatUnit.WEEKLY:
        return diffDays % (7 * master.repeatInterval) === 0;
      
      case RepeatUnit.MONTHLY: {
        if (start.getUTCDate() !== target.getUTCDate()) return false; 
        const monthDiff = (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
        return monthDiff % master.repeatInterval === 0;
      }
      
      case RepeatUnit.YEARLY: {
        if (start.getUTCDate() !== target.getUTCDate() || start.getUTCMonth() !== target.getUTCMonth()) return false;
        const yearDiff = target.getUTCFullYear() - start.getUTCFullYear();
        return yearDiff % master.repeatInterval === 0;
      }

      default:
        return false;
    }
  }

  // 5. BIẾN TASK ẢO THÀNH THẬT KHI USER TƯƠNG TÁC
  async realizeVirtualTask(userId: string, masterId: string, dueDate: string, updateData: UpdateTaskDto): Promise<Task> {
    const masterTask = await this.taskModel.findById(masterId).exec();
    if (!masterTask || masterTask.userId.toString() !== userId) {
      throw new NotFoundException('Quy tắc lặp lại không tồn tại');
    }

    const realTask = new this.taskModel({
      title: updateData.title || masterTask.title,
      description: updateData.description || masterTask.description,
      dueDate: new Date(dueDate),
      isCompleted: updateData.isCompleted ?? false,
      isImportant: updateData.isImportant ?? masterTask.isImportant ?? false, // Lấy cờ quan trọng chuẩn
      isMaster: false,
      masterId: masterTask._id,
      categoryId: masterTask.categoryId,
      userId: new Types.ObjectId(userId),
    });

    return realTask.save();
  }

  // 6. CẬP NHẬT TASK BÌNH THƯỜNG
  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    if (id.startsWith('virtual_')) {
      throw new BadRequestException('Đây là Task Ảo. Bạn phải gọi API /tasks/realize/:masterId trước khi cập nhật nội dung.');
    }

    const { categoryName, ...updateData } = updateTaskDto;
    let finalUpdateData: any = updateData;

    if (categoryName) {
      let category = await this.categoryModel.findOne({
        userId: new Types.ObjectId(userId),
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
      });

      if (!category) {
        category = await this.categoryModel.create({ name: categoryName, userId: new Types.ObjectId(userId), color: '#8B5CF6' });
      }
      finalUpdateData.categoryId = category._id as Types.ObjectId;
    }

    const updatedTask = await this.taskModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: finalUpdateData },
      { new: true }
    ).populate('categoryId', 'name color').exec();

    if (!updatedTask) throw new NotFoundException('Không tìm thấy công việc để cập nhật');
    return updatedTask;
  }

  // 7. XÓA TASK
  async remove(id: string, userId: string): Promise<{ message: string }> {
    if (id.startsWith('virtual_')) {
      throw new BadRequestException('Không thể xóa một ngày lẻ của Task lặp lại theo cách này. Vui lòng gửi ID của Master Task để xóa toàn bộ chu kỳ.');
    }

    const result = await this.taskModel.deleteOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Không tìm thấy công việc để xóa');
    return { message: 'Đã xóa công việc thành công' };
  }

  // 8. TÌM CHI TIẾT 1 TASK
  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.taskModel.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).populate('categoryId', 'name color').exec();
    if (!task) throw new NotFoundException('Không tìm thấy công việc này');
    return task;
  }
}