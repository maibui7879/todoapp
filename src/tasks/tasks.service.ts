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

  // 2. LẤY DANH SÁCH & SINH TASK ẢO TRÊN LỊCH
  async findAll(userId: string, dateString?: string, isCompletedStr?: string): Promise<any[]> {
    // Parse isCompleted filter
    let isCompletedFilter: boolean | undefined;
    if (isCompletedStr !== undefined) {
      isCompletedFilter = isCompletedStr === 'true';
    }

    if (!dateString) {
      // Nếu không lọc ngày, chỉ trả về các task thật (không phải quy tắc lặp)
      const query: any = { 
        userId: new Types.ObjectId(userId), 
        isMaster: false 
      };
      if (isCompletedFilter !== undefined) {
        query.isCompleted = isCompletedFilter;
      }
      return this.taskModel.find(query).populate('categoryId', 'name color').sort({ dueDate: 1 }).lean().exec();
    }

    const targetDate = new Date(dateString);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Bước A: Lấy các task THẬT trong ngày hôm đó
    const realTasksQuery: any = {
      userId: new Types.ObjectId(userId),
      isMaster: false,
      dueDate: { $gte: startOfDay, $lte: endOfDay }
    };
    if (isCompletedFilter !== undefined) {
      realTasksQuery.isCompleted = isCompletedFilter;
    }
    const realTasks = await this.taskModel.find(realTasksQuery).populate('categoryId', 'name color').lean().exec();

    // Lấy ID của các Master Task đã được "thực hóa" trong ngày hôm nay để tránh trùng lặp
    const realizedMasterIds = realTasks.map(t => t.masterId?.toString()).filter(id => id);

    // Bước B: Lấy các Master Task còn hiệu lực
    const masterTasks = await this.taskModel.find({
      userId: new Types.ObjectId(userId),
      isMaster: true,
      startDate: { $lte: targetDate } 
    }).populate('categoryId', 'name color').lean().exec();

    const virtualTasks: any[] = [];

    // Bước C: Tính toán nội suy ảo
    for (const master of masterTasks) {
      // Bỏ qua nếu ngày hôm nay User đã check/sửa cái task ảo này thành thật rồi
      if (realizedMasterIds.includes(master._id.toString())) continue;

      if (this.checkIfDateMatchesRule(targetDate, master)) {
        // Khôi phục lại giờ phút ban đầu của Master Task cho ngày mới
        const virtualDueDate = new Date(targetDate);
        const originalTime = new Date(master.dueDate);
        virtualDueDate.setUTCHours(originalTime.getUTCHours(), originalTime.getUTCMinutes(), 0, 0);

        const virtualTask = {
          _id: `virtual_${master._id}_${targetDate.getTime()}`, 
          title: master.title,
          description: master.description,
          dueDate: virtualDueDate,
          isCompleted: false,
          categoryId: master.categoryId,
          isVirtual: true, 
          masterId: master._id 
        };

        // Áp dụng filter isCompleted cho virtual tasks
        if (isCompletedFilter === undefined || virtualTask.isCompleted === isCompletedFilter) {
          virtualTasks.push(virtualTask);
        }
      }
    }

    return [...realTasks, ...virtualTasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // Hàm Toán học kiểm tra chu kỳ
  private checkIfDateMatchesRule(targetDate: Date, master: any): boolean {
    const start = new Date(master.startDate);
    start.setUTCHours(0,0,0,0);
    const target = new Date(targetDate);
    target.setUTCHours(0,0,0,0);
    
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return false;

    switch (master.repeatUnit) {
      case RepeatUnit.DAILY:
      case RepeatUnit.FIXED_DAYS:
        return diffDays % master.repeatInterval === 0;
      
      case RepeatUnit.WEEKLY:
        return diffDays % (7 * master.repeatInterval) === 0;
      
      // LOGIC THÁNG
      case RepeatUnit.MONTHLY: {
        if (start.getUTCDate() !== target.getUTCDate()) return false; // Khác ngày trong tháng -> Bỏ qua
        const monthDiff = (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
        return monthDiff % master.repeatInterval === 0;
      }
      
      // LOGIC NĂM
      case RepeatUnit.YEARLY: {
        if (start.getUTCDate() !== target.getUTCDate() || start.getUTCMonth() !== target.getUTCMonth()) return false;
        const yearDiff = target.getUTCFullYear() - start.getUTCFullYear();
        return yearDiff % master.repeatInterval === 0;
      }

      default:
        return false;
    }
  }

  // 3. BIẾN TASK ẢO THÀNH THẬT KHI USER TƯƠNG TÁC (TICK HOÀN THÀNH HOẶC CẬP NHẬT)
  async realizeVirtualTask(userId: string, masterId: string, dueDate: string, updateData: UpdateTaskDto): Promise<Task> {
    const masterTask = await this.taskModel.findById(masterId).exec();
    if (!masterTask || masterTask.userId.toString() !== userId) {
      throw new NotFoundException('Quy tắc lặp lại không tồn tại');
    }

    // Tạo ra một Task thật cho ngày hôm đó, trỏ về Master Task
    const realTask = new this.taskModel({
      title: updateData.title || masterTask.title,
      description: updateData.description || masterTask.description,
      dueDate: new Date(dueDate),
      isCompleted: updateData.isCompleted ?? false,
      isMaster: false,
      masterId: masterTask._id,
      categoryId: masterTask.categoryId,
      userId: new Types.ObjectId(userId),
    });

    return realTask.save();
  }

  // 4. CẬP NHẬT TASK BÌNH THƯỜNG
  async update(id: string, userId: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    // Guard: Bảo vệ không cho sửa Virtual Task
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

  // 5. XÓA TASK
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Guard: Bảo vệ không cho xóa Virtual Task
    if (id.startsWith('virtual_')) {
      throw new BadRequestException('Không thể xóa một ngày lẻ của Task lặp lại theo cách này. Vui lòng gửi ID của Master Task để xóa toàn bộ chu kỳ.');
    }

    const result = await this.taskModel.deleteOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Không tìm thấy công việc để xóa');
    return { message: 'Đã xóa công việc thành công' };
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.taskModel.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).populate('categoryId', 'name color').exec();
    if (!task) throw new NotFoundException('Không tìm thấy công việc này');
    return task;
  }
}

