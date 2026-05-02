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

  // --- API MỚI: TỔNG QUAN TRỌN ĐỜI ---
  async getOverviewStats(userId: string) {
    const today = new Date();
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    // 1. Chỉ lấy ngày tháng của các Task Thật ĐÃ HOÀN THÀNH (Dùng .select('dueDate') để query siêu nhanh)
    const completedTasks = await this.taskModel.find({
      userId: new Types.ObjectId(userId),
      isCompleted: true,
      isMaster: false,
      dueDate: { $lte: endOfToday }
    })
    .select('dueDate')
    .sort({ dueDate: -1 }) // Xếp mới nhất lên đầu
    .lean()
    .exec();

    const totalTasksCompletedLifetime = completedTasks.length;

    // 2. Gom nhóm các ngày lại, loại bỏ ngày trùng nhau (Ví dụ 1 ngày làm 5 việc thì chỉ tính là 1 ngày active)
    const activeDatesStr = [...new Set(completedTasks.map(t => new Date(t.dueDate).toISOString().split('T')[0]))];

    // 3. Thuật toán đếm Streak
    let currentStreak = 0;
    let longestStreak = 0;

    if (activeDatesStr.length > 0) {
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // --- Tính Chuỗi Hiện Tại (Current Streak) ---
      // Nếu ngày active gần nhất là Hôm nay hoặc Hôm qua, thì chuỗi hiện tại vẫn còn sống
      if (activeDatesStr[0] === todayStr || activeDatesStr[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 0; i < activeDatesStr.length - 1; i++) {
          const curr = new Date(activeDatesStr[i]);
          const prev = new Date(activeDatesStr[i + 1]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak++;
          } else {
            break; // Khoảng cách lớn hơn 1 ngày -> Đứt chuỗi
          }
        }
      }

      // --- Tính Chuỗi Kỷ Lục (Longest Streak) ---
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
          tempStreak = 1; // Đứt thì reset lại từ 1
        }
      }
    }

    // --- 4. MỚI: TÍNH TRẠNG THÁI 7 NGÀY GẦN NHẤT ---
    const last7DaysStatus: Array<{ date: string; dayOfWeek: number; isActive: boolean }> = [];
    // Chạy vòng lặp từ 6 lùi về 0 để mảy xếp theo thứ tự thời gian (Cũ -> Mới)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const dateStr = d.toISOString().split('T')[0];
      
      // Lấy tên thứ bằng tiếng Việt hoặc Anh (tùy FE, ở đây mình cung cấp thứ trong tuần 0-6)
      const dayOfWeek = d.getDay(); 
      
      last7DaysStatus.push({
        date: dateStr,
        dayOfWeek: dayOfWeek, // 0: Chủ nhật, 1: T2, ..., 6: T7
        isActive: activeDatesStr.includes(dateStr) // Kiểm tra xem ngày này có nằm trong danh sách đã làm không
      });
    }

    return {
      currentStreak,
      longestStreak,
      totalTasksCompletedLifetime,
      last7DaysStatus
    };
  }

  // --- API CŨ: CHI TIẾT TUẦN / THÁNG / NĂM (GIỮ NGUYÊN CODE) ---
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