import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/entities/task.entity';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private tasksService: TasksService
  ) {}

  // =========================================================================
  // API 1: TỔNG QUAN TRỌN ĐỜI (STREAK & TRẠNG THÁI 7 NGÀY)
  // =========================================================================
  async getOverviewStats(userId: string) {
    const today = new Date();
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // 1. Chỉ lấy ngày tháng của các Task Thật ĐÃ HOÀN THÀNH
    const completedTasks = await this.taskModel.find({
      userId: new Types.ObjectId(userId),
      isCompleted: true,
      isMaster: false,
      dueDate: { $lte: endOfToday }
    })
    .select('dueDate')
    .sort({ dueDate: -1 }) 
    .lean()
    .exec();

    const totalTasksCompletedLifetime = completedTasks.length;

    // 2. Gom nhóm các ngày lại (Mảng chứa các chuỗi 'YYYY-MM-DD')
    const activeDatesStr = [...new Set(completedTasks.map(t => new Date(t.dueDate).toISOString().split('T')[0]))];

    // 3. Thuật toán đếm Streak
    let currentStreak = 0;
    let longestStreak = 0;

    if (activeDatesStr.length > 0) {
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Tính Chuỗi Hiện Tại
      if (activeDatesStr[0] === todayStr || activeDatesStr[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 0; i < activeDatesStr.length - 1; i++) {
          const curr = new Date(activeDatesStr[i]);
          const prev = new Date(activeDatesStr[i + 1]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break; 
          }
        }
      }

      // Tính Chuỗi Kỷ Lục
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 0; i < activeDatesStr.length - 1; i++) {
        const curr = new Date(activeDatesStr[i]);
        const prev = new Date(activeDatesStr[i + 1]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else {
          tempStreak = 1; 
        }
      }
    }

    // 4. Trạng thái 7 ngày gần nhất
    const last7DaysStatus: Array<{ date: string; dayOfWeek: number; isActive: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); 
      
      last7DaysStatus.push({
        date: dateStr,
        dayOfWeek: dayOfWeek,
        isActive: activeDatesStr.includes(dateStr)
      });
    }

    return {
      currentStreak,
      longestStreak,
      totalTasksCompletedLifetime,
      last7DaysStatus
    };
  }

  // =========================================================================
  // API 2: THỐNG KÊ CHI TIẾT (DÙNG ĐỂ VẼ BIỂU ĐỒ TRÊN FRONTEND)
  // =========================================================================
  async getDetailedStats(userId: string, type: 'week' | 'month' | 'year', dateStr?: string) {
    // 1. TÍNH TOÁN KHOẢNG THỜI GIAN
    const refDate = dateStr ? new Date(dateStr) : new Date();
    let startDate: Date;
    let endDate: Date;

    if (type === 'week') {
      const day = refDate.getDay(); 
      const diffToMonday = refDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(refDate.setDate(diffToMonday));
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);
    } else if (type === 'month') {
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      startDate = new Date(refDate.getFullYear(), 0, 1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(refDate.getFullYear(), 11, 31);
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // 2. GỌI TASKS SERVICE ĐỂ LẤY TOÀN BỘ DATA (THẬT + ẢO)
    const tasks = await this.tasksService.findAll(
      userId,
      startDate.toISOString(),
      endDate.toISOString()
    );

    const now = new Date();

    const overview = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      important: 0,
    };

    const byCategory: Record<string, { count: number; name: string; color: string; completed: number }> = {};
    const chartTrend: Record<string, { label: string; total: number; completed: number }> = {};

    // 3. KHỞI TẠO BUCKET BIỂU ĐỒ (DỰA TRÊN TYPE)
    if (type === 'week') {
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const dateKey = curr.toISOString().split('T')[0];
        chartTrend[dateKey] = { label: dateKey, total: 0, completed: 0 };
        curr.setDate(curr.getDate() + 1);
      }
    } else if (type === 'month') {
      const monthStr = (startDate.getMonth() + 1).toString().padStart(2, '0');
      const lastDay = endDate.getDate();

      chartTrend['W1'] = { label: `Tuần 1 (01/${monthStr} - 07/${monthStr})`, total: 0, completed: 0 };
      chartTrend['W2'] = { label: `Tuần 2 (08/${monthStr} - 14/${monthStr})`, total: 0, completed: 0 };
      chartTrend['W3'] = { label: `Tuần 3 (15/${monthStr} - 21/${monthStr})`, total: 0, completed: 0 };
      chartTrend['W4'] = { label: `Tuần 4 (22/${monthStr} - 28/${monthStr})`, total: 0, completed: 0 };
      
      if (lastDay > 28) {
        chartTrend['W5'] = { label: `Tuần 5 (29/${monthStr} - ${lastDay}/${monthStr})`, total: 0, completed: 0 };
      }
    } else if (type === 'year') {
      for (let i = 0; i < 12; i++) {
        chartTrend[`M${i + 1}`] = { label: `Tháng ${i + 1}`, total: 0, completed: 0 };
      }
    }

    // 4. QUÉT DATA VÀ PHÂN BỔ
    tasks.forEach(task => {
      const taskDate = new Date(task.dueDate);
      const dateKey = taskDate.toISOString().split('T')[0];

      // A. Cập nhật Overview
      if (task.isCompleted) {
        overview.completed++;
      } else {
        overview.pending++;
        if (taskDate < now) overview.overdue++; 
      }
      if (task.isImportant) overview.important++;

      // B. Cập nhật Category
      const catId = task.categoryId?._id?.toString() || 'unassigned';
      if (!byCategory[catId]) {
        byCategory[catId] = {
          name: task.categoryId?.name || 'Chưa phân loại',
          color: task.categoryId?.color || '#cbd5e1',
          count: 0,
          completed: 0
        };
      }
      byCategory[catId].count++;
      if (task.isCompleted) byCategory[catId].completed++;

      // C. Phân bổ vào Bucket Biểu đồ
      let bucketKey = '';
      if (type === 'week') {
        bucketKey = dateKey;
      } else if (type === 'month') {
        const dateNum = taskDate.getDate();
        if (dateNum <= 7) bucketKey = 'W1';
        else if (dateNum <= 14) bucketKey = 'W2';
        else if (dateNum <= 21) bucketKey = 'W3';
        else if (dateNum <= 28) bucketKey = 'W4';
        else bucketKey = 'W5'; 
      } else if (type === 'year') {
        bucketKey = `M${taskDate.getMonth() + 1}`;
      }

      if (chartTrend[bucketKey]) {
        chartTrend[bucketKey].total++;
        if (task.isCompleted) chartTrend[bucketKey].completed++;
      }
    });

    const completionRate = overview.total === 0 ? 0 : Math.round((overview.completed / overview.total) * 100);

    return {
      meta: {
        period: type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overview: {
        ...overview,
        completionRate, 
      },
      byCategory: Object.values(byCategory), 
      chartTrend: Object.values(chartTrend).map(item => ({
        ...item,
        percentage: item.total === 0 ? 0 : Math.round((item.completed / item.total) * 100)
      })),
    };
  }
}