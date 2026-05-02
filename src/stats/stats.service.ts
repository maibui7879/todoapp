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
    const activeDatesStr = [...new Set(completedTasks.map(t => new Date(t.dueDate).toISOString().split('T')[0]))];

    let currentStreak = 0;
    let longestStreak = 0;

    if (activeDatesStr.length > 0) {
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

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
  // API 2: THỐNG KÊ CHI TIẾT (ROLLING 7 DAYS, 30 DAYS, 12 MONTHS)
  // =========================================================================
  async getDetailedStats(userId: string, type: 'week' | 'month' | 'year', dateStr?: string) {
    // 1. TÍNH TOÁN KHOẢNG THỜI GIAN CUỐN CHIẾU
    const refDate = dateStr ? new Date(dateStr) : new Date();
    let startDate: Date;
    let endDate: Date;

    if (type === 'week') {
      endDate = new Date(refDate);
      endDate.setHours(23, 59, 59, 999);
      
      startDate = new Date(refDate);
      startDate.setDate(startDate.getDate() - 6); // Lấy 6 ngày trước + hôm nay = 7 ngày
      startDate.setHours(0, 0, 0, 0);
    } else if (type === 'month') {
      endDate = new Date(refDate);
      endDate.setHours(23, 59, 59, 999);
      
      startDate = new Date(refDate);
      startDate.setDate(startDate.getDate() - 29); // Lấy 29 ngày trước + hôm nay = 30 ngày
      startDate.setHours(0, 0, 0, 0);
    } else { // type === 'year'
      // Năm: Lấy ngày cuối cùng của tháng hiện tại (của refDate)
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      
      // Bắt đầu từ ngày mùng 1 của 11 tháng trước đó (Tổng cộng 12 tháng)
      startDate = new Date(refDate.getFullYear(), refDate.getMonth() - 11, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    // 2. LẤY DATA
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

    // 3. KHỞI TẠO BUCKET BIỂU ĐỒ MỚI
    if (type === 'week' || type === 'month') {
      // Tuần và Tháng bây giờ đều chia theo từng ngày
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        
        const dateKey = `${y}-${m}-${d}`;
        // FE sẽ nhận label gọn gàng như "04/05", "05/05" để vẽ trục X cho đẹp
        const label = `${d}/${m}`; 

        chartTrend[dateKey] = { label, total: 0, completed: 0 };
        curr.setDate(curr.getDate() + 1);
      }
    } else if (type === 'year') {
      // Năm chia theo từng tháng
      let curr = new Date(startDate);
      for (let i = 0; i < 12; i++) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        
        const monthKey = `${y}-${m}`;
        const label = `${m}/${y}`; // Nhãn "05/2026"

        chartTrend[monthKey] = { label, total: 0, completed: 0 };
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    // 4. QUÉT DATA VÀ PHÂN BỔ
    tasks.forEach(task => {
      const taskDate = new Date(task.dueDate);
      
      // Cập nhật Overview
      if (task.isCompleted) {
        overview.completed++;
      } else {
        overview.pending++;
        if (taskDate < now) overview.overdue++; 
      }
      if (task.isImportant) overview.important++;

      // Cập nhật Category
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

      // Phân bổ vào Bucket
      const y = taskDate.getFullYear();
      const m = String(taskDate.getMonth() + 1).padStart(2, '0');
      const d = String(taskDate.getDate()).padStart(2, '0');
      
      let bucketKey = '';
      if (type === 'week' || type === 'month') {
        bucketKey = `${y}-${m}-${d}`; // Rơi vào đúng ngày
      } else if (type === 'year') {
        bucketKey = `${y}-${m}`; // Rơi vào đúng tháng
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