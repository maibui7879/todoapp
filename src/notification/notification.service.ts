import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Notification, NotificationDocument } from './entities/notification.entity';
import { Task, TaskDocument } from '../tasks/entities/task.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    // 💉 Tiêm Gateway vào Service
    private notificationGateway: NotificationGateway, 
  ) {}

  // 1. API: Lấy danh sách lịch sử thông báo cho UI "Quả chuông"
  async getUserNotifications(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 }) // Mới nhất lên đầu
      .limit(30) // Trả về 30 cái gần nhất thôi cho nhẹ
      .exec();
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

    // Lấy các Task CHẬM NHẤT 30 phút nữa phải xong, chưa hoàn thành và là task thật
    const upcomingTasks = await this.taskModel.find({
      isCompleted: false,
      isMaster: false,
      dueDate: { $gte: now, $lte: targetTime }
    });

    for (const task of upcomingTasks) {
      // Kiểm tra xem đã báo cho task này chưa để tránh spam
      const existingNotif = await this.notificationModel.findOne({ taskId: task._id });
      
      if (!existingNotif) {
        const title = '⏰ Sắp đến hạn!';
        const message = `Công việc "${task.title}" của bạn sẽ đến hạn vào lúc ${task.dueDate.getHours()}h${task.dueDate.getMinutes()}`;

        // A. Lưu vào Database
        const newNotif = await this.notificationModel.create({
          title,
          message,
          taskId: task._id,
          userId: task.userId
        });

        // B. KÍCH HOẠT SOCKET: Bắn ngay cục data vừa tạo xuống Web
        this.notificationGateway.sendNotificationToUser(
          task.userId.toString(), 
          newNotif 
        );
      }
    }
  }
}
