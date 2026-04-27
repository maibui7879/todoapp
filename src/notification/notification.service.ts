import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationDocument } from './entities/notification.entity';
import { Task, TaskDocument } from '../tasks/entities/task.entity';
import { NotificationGateway } from './notification.gateway';
import { TasksService } from '../tasks/tasks.service';
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    //  Tiêm Gateway vào Service
    private notificationGateway: NotificationGateway, 
    private tasksService: TasksService
  ) {}

  // 1. API: Lấy danh sách lịch sử thông báo cho UI "Quả chuông"
  async getHistory(userId: string, keyword?: string, taskId?: string, isImportantStr?: string): Promise<Notification[]> {
    const query: any = { userId: new Types.ObjectId(userId) };

    // Lọc theo từ khóa (Tìm kiếm tương đối không phân biệt hoa thường)
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { message: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Lọc theo taskId chính xác
    if (taskId) {
      query.taskId = taskId;
    }

    // Lọc theo mức độ quan trọng
    if (isImportantStr !== undefined) {
      query.isImportant = isImportantStr === 'true';
    }

    // Trả về tối đa 50 thông báo mới nhất
    return this.notificationModel.find(query).sort({ createdAt: -1 }).limit(50).exec();
  }

  async markAllAsRead(userId: string): Promise<{ message: string, modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    ).exec();

    return { 
      message: 'Đã đánh dấu tất cả là đã đọc', 
      modifiedCount: result.modifiedCount 
    };
  }

  // 2. API: Đánh dấu 1 thông báo là đã đọc
  async markAsRead(id: string, userId: string) {
    const notif = await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notif) throw new NotFoundException('Không tìm thấy thông báo');
    return notif;
  }

  // 3. TÁC VỤ NGẦM: Chạy mỗi 5 phút rà soát Task
@Cron(CronExpression.EVERY_5_MINUTES)
  async checkUpcomingTasksAndNotify() {
    this.logger.log('Đang quét các công việc sắp đến hạn...');
    
    const now = new Date();
    const targetTime = new Date(now.getTime() + 30 * 60000); // Tương lai 30 phút
    
    // Mảng tập hợp tất cả task cần báo (cả thật lẫn ảo)
    const pendingNotifications: any[] = [];

    // --- 1. XỬ LÝ TASK THẬT ---
    const realTasks = await this.taskModel.find({
      isCompleted: false,
      isMaster: false,
      dueDate: { $gte: now, $lte: targetTime }
    });

    realTasks.forEach(task => {
      pendingNotifications.push({
        taskId: task._id.toString(),
        title: task.title,
        dueDate: task.dueDate,
        userId: task.userId,
        isImportant: task.isImportant,
      });
    });

    // --- 2. XỬ LÝ TASK ẢO (TỪ MASTER TASKS) ---
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const masterTasks = await this.taskModel.find({
      isMaster: true,
      startDate: { $lte: targetTime }
    });

    for (const master of masterTasks) {
      // Nếu hôm nay là ngày lặp lại của task này
      if (this.tasksService.checkIfDateMatchesRule(todayStart, master)) {
        
        // Tạo mốc thời gian ảo cho ngày hôm nay
        const virtualDueDate = new Date(todayStart);
        virtualDueDate.setUTCHours(master.dueDate.getUTCHours(), master.dueDate.getUTCMinutes(), 0, 0);

        // Nếu giờ ảo này nằm trong 30 phút tới
        if (virtualDueDate >= now && virtualDueDate <= targetTime) {
          
          // Kiểm tra xem task ảo này đã bị check/sửa thành thật trong hôm nay chưa
          const isRealized = realTasks.some(rt => rt.masterId?.toString() === master._id.toString());
          
          if (!isRealized) {
            pendingNotifications.push({
              taskId: `virtual_${master._id}_${todayStart.getTime()}`,
              title: master.title,
              dueDate: virtualDueDate,
              userId: master.userId,
              isImportant: master.isImportant,
            });
          }
        }
      }
    }

    // --- 3. TIẾN HÀNH BẮN THÔNG BÁO ---
    for (const item of pendingNotifications) {
      // Dùng taskId (chuỗi) để check trùng lặp, tránh spam mỗi 5 phút
      const existingNotif = await this.notificationModel.findOne({ taskId: item.taskId });
      
      if (!existingNotif) {
        const title = 'Sắp đến hạn!';
        const message = `Công việc "${item.title}" của bạn sẽ đến hạn vào lúc ${item.dueDate.getHours()}h${item.dueDate.getMinutes()}`;

        const newNotif = await this.notificationModel.create({
          title,
          message,
          taskId: item.taskId, 
          userId: item.userId,
          isImportant: item.isImportant,
        });

        this.notificationGateway.sendNotificationToUser(item.userId.toString(), newNotif);
      }
    }
  }
}
