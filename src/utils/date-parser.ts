import { DateRange } from '../types';
import { logger } from './logger';

export class PeriodParser {
  private static readonly TIMEZONE = 'Asia/Tokyo';

  public static parse(period: string, timezone: string = this.TIMEZONE): DateRange {
    const now = new Date();

    switch (period.toLowerCase()) {
      case 'today':
        return this.parseToday(now, timezone);
      case 'yesterday':
        return this.parseYesterday(now, timezone);
      default:
        // Try to parse as date (YYYY-MM-DD)
        return this.parseDate(period, timezone);
    }
  }

  public static validate(period: string): boolean {
    try {
      const dateRange = this.parse(period);
      return this.validateDateRange(dateRange);
    } catch (error) {
      logger.warn(`Invalid period format: ${period}`, error);
      return false;
    }
  }

  public static getMaxAllowedDate(): Date {
    const now = new Date();
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
  }

  private static parseToday(now: Date, timezone: string): DateRange {
    // Convert current time to JST to get the correct "today"
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

    // Create start of day in JST (00:00:00)
    const startJST = new Date(jstNow);
    startJST.setHours(0, 0, 0, 0);

    // Create end of day in JST (23:59:59)
    const endJST = new Date(jstNow);
    endJST.setHours(23, 59, 59, 999);

    // Convert JST times back to UTC for storage
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const start = new Date(startJST.getTime() - jstOffset);
    const end = new Date(endJST.getTime() - jstOffset);

    return {
      start,
      end,
      label: '今日'
    };
  }

  private static parseYesterday(now: Date, timezone: string): DateRange {
    // Convert current time to JST to get the correct "yesterday"
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));

    // Get yesterday's date in JST
    const yesterdayJST = new Date(jstNow);
    yesterdayJST.setDate(yesterdayJST.getDate() - 1);

    // Create start of day in JST (00:00:00)
    const startJST = new Date(yesterdayJST);
    startJST.setHours(0, 0, 0, 0);

    // Create end of day in JST (23:59:59)
    const endJST = new Date(yesterdayJST);
    endJST.setHours(23, 59, 59, 999);

    // Convert JST times back to UTC for storage
    const jstOffset = 9 * 60 * 60 * 1000; // JST is UTC+9
    const start = new Date(startJST.getTime() - jstOffset);
    const end = new Date(endJST.getTime() - jstOffset);

    return {
      start,
      end,
      label: '昨日'
    };
  }

  private static parseDate(dateString: string, _timezone: string): DateRange {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
    }

    const date = new Date(dateString + 'T00:00:00');

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateString}`);
    }

    // Set to start of day (00:00:00)
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    // Set to end of day (23:59:59)
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return {
      start,
      end,
      label: dateString
    };
  }

  private static validateDateRange(dateRange: DateRange): boolean {
    const now = new Date();
    const oneWeekAgo = this.getMaxAllowedDate();

    // Check if start date is not more than 1 week ago
    if (dateRange.start < oneWeekAgo) {
      return false;
    }

    // Check if start is before end
    if (dateRange.start >= dateRange.end) {
      return false;
    }

    // Check if end is not in the future
    // For "today", allow end of day even if it's technically in the future
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    if (dateRange.end > endOfToday) {
      return false;
    }

    return true;
  }

  public static formatDateRange(dateRange: DateRange): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.TIMEZONE
    };

    const startStr = dateRange.start.toLocaleString('ja-JP', options);
    const endStr = dateRange.end.toLocaleString('ja-JP', options);

    return `${startStr} 〜 ${endStr}`;
  }

  public static getAvailablePeriods(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'today',
        label: '今日',
        description: '今日の00:00から23:59まで'
      },
      {
        value: 'yesterday',
        label: '昨日',
        description: '昨日の00:00から23:59まで'
      },
      {
        value: 'YYYY-MM-DD',
        label: '日付指定',
        description: '指定した日の00:00から23:59まで（例: 2024-01-15）'
      }
    ];
  }
}

export const periodParser = PeriodParser;