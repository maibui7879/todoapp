import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/entities/task.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async getDashboardStats(userId: string) {
    const userObjId = new Types.ObjectId(userId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Tính toán tổng quan trong ngày
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayTasks = await this.taskModel.find({
      userId: userObjId,
      dueDate: { $gte: today, $lte: endOfDay },
      isMaster: false,
    });

    const totalToday = todayTasks.length;
    const completedToday = todayTasks.filter(t => t.isCompleted).length;
    const completionRate = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

    // 2. Tính toán chuỗi liên tục (Streaks)
    // Lấy tất cả task đã hoàn thành trong quá khứ, sắp xếp theo ngày giảm dần
    const pastCompletedTasks = await this.taskModel.find({
      userId: userObjId,
      isCompleted: true,
      dueDate: { $lte: endOfDay },
      isMaster: false
    }).sort({ dueDate: -1 }).exec();

    let currentStreak = 0;
    let checkDate = new Date(today);

    // Thuật toán đếm lùi ngày để tính streak
    for (let i = 0; i < 365; i++) { // Giới hạn quét 1 năm
      const startOfCheckDate = new Date(checkDate);
      startOfCheckDate.setUTCHours(0, 0, 0, 0);
      const endOfCheckDate = new Date(checkDate);
      endOfCheckDate.setUTCHours(23, 59, 59, 999);

      const hasCompletedTaskOnDate = pastCompletedTasks.some(
        task => task.dueDate >= startOfCheckDate && task.dueDate <= endOfCheckDate
      );

      if (hasCompletedTaskOnDate) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // Lùi 1 ngày
      } else if (i === 0) {
        // Nếu hôm nay chưa làm thì bỏ qua, lùi về hôm qua để kiểm tra streak cũ
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break; // Chuỗi bị đứt
      }
    }

    return {
      totalToday,
      completedToday,
      completionRate,
      currentStreak
    };
  }
}
