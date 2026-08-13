'use strict';

import { DateTime } from 'luxon';

// 中国法定节假日配置（可扩展）
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', '2026-01-03', // 元旦
  '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节
  '2026-04-04', '2026-04-05', '2026-04-06', // 清明
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
  '2026-06-14', '2026-06-15', '2026-06-16', // 端午
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', // 国庆
];

// 周末调休工作日配置
const WORKDAYS_ON_WEEKEND_2026 = [
  '2026-02-15', '2026-02-16', // 春节调休
  '2026-10-10', '2026-10-11', // 国庆调休
];

/**
 * 将任意日期值转换为 Date 对象
 * 处理 Strapi 数据库层可能返回字符串的情况
 */
function ensureDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

/**
 * 将任意日期值转换为 YYYY-MM-DD 字符串（本地时区）
 * 用于数据库查询，避免 Date 对象的时区偏移导致精确匹配失败
 * PostgreSQL date 列存 '2026-08-12'，pg 客户端读出为 '2026-08-11T16:00:00Z'（UTC+8），
 * 直接用 Date 对象查询会因时区偏移导致 WHERE nav_date = '2026-08-11T16:00:00Z' 不匹配
 */
export function toDateStr(value: Date | string): string {
  const dateObj = ensureDate(value);
  return DateTime.fromJSDate(dateObj).toISODate();
}

/**
 * 判断是否为交易日
 */
export function isTradingDay(date: Date | string): boolean {
  const dateObj = ensureDate(date);
  const dateStr = DateTime.fromJSDate(dateObj).toISODate();
  const dayOfWeek = dateObj.getDay();

  // 周末调休工作日
  if (WORKDAYS_ON_WEEKEND_2026.includes(dateStr)) {
    return true;
  }

  // 周末非交易日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 法定节假日非交易日
  if (HOLIDAYS_2026.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 获取指定日期往前N个交易日
 */
export function getPreviousTradingDay(currentDate: Date | string, tradingDaysCount: number): Date | null {
  const dateObj = ensureDate(currentDate);
  let count = 0;
  let checkDate = new Date(dateObj);

  while (count < tradingDaysCount) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (isTradingDay(checkDate)) {
      count++;
    }
    // 防止无限循环（最多往前查365天）
    if (DateTime.fromJSDate(dateObj).diff(DateTime.fromJSDate(checkDate), 'days').days > 365) {
      return null;
    }
  }

  return checkDate;
}

/**
 * 获取两个日期之间的自然日天数（不含起始日，含结束日）
 */
export function getNaturalDays(startDate: Date | string, endDate: Date | string): number {
  const start = DateTime.fromJSDate(ensureDate(startDate));
  const end = DateTime.fromJSDate(ensureDate(endDate));
  const diff = end.diff(start, 'days').days;
  if (isNaN(diff)) return 0;
  return Math.floor(diff);
}

/**
 * 获取指定日期范围内的所有交易日
 */
export function getTradingDays(startDate: Date, endDate: Date): Date[] {
  const tradingDays: Date[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    if (isTradingDay(current)) {
      tradingDays.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return tradingDays;
}