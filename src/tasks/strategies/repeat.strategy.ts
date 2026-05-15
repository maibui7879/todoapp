import { RepeatUnit } from '../entities/task.entity';

// 1. Định nghĩa Interface chung cho tất cả các chiến lược lặp lại
export interface RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean;
}

// 2. Triển khai các chiến lược cụ thể (Concrete Strategies)
export class DailyStrategy implements RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean {
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays % master.repeatInterval === 0;
  }
}

export class WeeklyStrategy implements RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean {
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays % (7 * master.repeatInterval) === 0;
  }
}

export class MonthlyStrategy implements RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean {
    if (start.getUTCDate() !== target.getUTCDate()) return false; 
    const monthDiff = (target.getUTCFullYear() - start.getUTCFullYear()) * 12 + (target.getUTCMonth() - start.getUTCMonth());
    return monthDiff % master.repeatInterval === 0;
  }
}

export class YearlyStrategy implements RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean {
    if (start.getUTCDate() !== target.getUTCDate() || start.getUTCMonth() !== target.getUTCMonth()) return false;
    const yearDiff = target.getUTCFullYear() - start.getUTCFullYear();
    return yearDiff % master.repeatInterval === 0;
  }
}

export class FixedDaysStrategy implements RepeatStrategy {
  matches(target: Date, start: Date, master: any): boolean {
    const targetDayOfWeek = target.getUTCDay(); // 0 là CN, 1 là T2...
    if (master.repeatDays && master.repeatDays.length > 0) {
      return master.repeatDays.includes(targetDayOfWeek);
    }
    return false;
  }
}

// 3. Tạo Factory để cấp phát Strategy động dựa vào RepeatUnit
export class RepeatStrategyFactory {
  private static strategies = new Map<string, RepeatStrategy>([
    [RepeatUnit.DAILY, new DailyStrategy()],
    [RepeatUnit.WEEKLY, new WeeklyStrategy()],
    [RepeatUnit.MONTHLY, new MonthlyStrategy()],
    [RepeatUnit.YEARLY, new YearlyStrategy()],
    [RepeatUnit.FIXED_DAYS, new FixedDaysStrategy()],
  ]);

  static getStrategy(unit: string): RepeatStrategy | undefined {
    return this.strategies.get(unit);
  }
}