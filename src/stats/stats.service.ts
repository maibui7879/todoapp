import { Injectable } from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class StatsService {
  constructor(private tasksService: TasksService) {}

  async getDetailedStats(userId: string, type: 'week' | 'month' | 'year', dateStr?: string) {
    // 1. TÍNH TOÁN KHOẢNG THỜI GIAN (START DATE & END DATE)
    const refDate = dateStr ? new Date(dateStr) : new Date();
    let startDate: Date;
    let endDate: Date;

    if (type === 'week') {
      // Tìm ngày Thứ 2 của tuần chứa refDate
      const day = refDate.getDay(); 
      const diffToMonday = refDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(refDate.setDate(diffToMonday));
      startDate.setUTCHours(0, 0, 0, 0);

      // Tìm ngày Chủ nhật
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setUTCHours(23, 59, 59, 999);
    } else if (type === 'month') {
      // Tìm ngày đầu tháng và cuối tháng
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      startDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      // Tìm ngày đầu năm và cuối năm
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

    // --- KHỞI TẠO CÁC BIẾN LƯU TRỮ THỐNG KÊ ---
    const overview = {
      total: tasks.length,
      completed: 0,
      pending: 0,
      overdue: 0,
      important: 0,
    };

    const byCategory: Record<string, { count: number; name: string; color: string; completed: number }> = {};
    const dailyTrend: Record<string, { total: number; completed: number }> = {};

    // Dựng khung mảng Daily Trend cho toàn bộ các ngày (để biểu đồ không bị đứt đoạn)
    let curr = new Date(startDate);
    while (curr <= endDate) {
      const dateKey = curr.toISOString().split('T')[0];
      dailyTrend[dateKey] = { total: 0, completed: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    // 3. XỬ LÝ QUÉT QUA MẢNG TASK ĐỂ TÍNH TOÁN
    tasks.forEach(task => {
      const taskDate = new Date(task.dueDate);
      const dateKey = taskDate.toISOString().split('T')[0];

      // A. Cập nhật Tổng quan (Overview)
      if (task.isCompleted) {
        overview.completed++;
      } else {
        overview.pending++;
        if (taskDate < now) overview.overdue++; // Quá hạn
      }
      if (task.isImportant) overview.important++;

      // B. Cập nhật theo Danh mục (Category)
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

      // C. Cập nhật Biểu đồ Xu hướng ngày (Daily Trend)
      if (dailyTrend[dateKey]) {
        dailyTrend[dateKey].total++;
        if (task.isCompleted) dailyTrend[dateKey].completed++;
      }
    });

    // 4. TÍNH TOÁN TỶ LỆ PHẦN TRĂM VÀ FORMAT KẾT QUẢ
    const completionRate = overview.total === 0 ? 0 : Math.round((overview.completed / overview.total) * 100);

    return {
      meta: {
        period: type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overview: {
        ...overview,
        completionRate, // Trả về phần trăm (Ví dụ: 85%)
      },
      byCategory: Object.values(byCategory), // Chuyển Object thành Array cho FE dễ dùng map()
      dailyTrend: Object.entries(dailyTrend).map(([date, data]) => ({ date, ...data })),
    };
  }
}