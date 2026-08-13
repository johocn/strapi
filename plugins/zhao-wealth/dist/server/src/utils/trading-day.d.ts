/**
 * 将任意日期值转换为 YYYY-MM-DD 字符串（本地时区）
 * 用于数据库查询，避免 Date 对象的时区偏移导致精确匹配失败
 * PostgreSQL date 列存 '2026-08-12'，pg 客户端读出为 '2026-08-11T16:00:00Z'（UTC+8），
 * 直接用 Date 对象查询会因时区偏移导致 WHERE nav_date = '2026-08-11T16:00:00Z' 不匹配
 */
export declare function toDateStr(value: Date | string): string;
/**
 * 判断是否为交易日
 */
export declare function isTradingDay(date: Date | string): boolean;
/**
 * 获取指定日期往前N个交易日
 */
export declare function getPreviousTradingDay(currentDate: Date | string, tradingDaysCount: number): Date | null;
/**
 * 获取两个日期之间的自然日天数（不含起始日，含结束日）
 */
export declare function getNaturalDays(startDate: Date | string, endDate: Date | string): number;
/**
 * 获取指定日期范围内的所有交易日
 */
export declare function getTradingDays(startDate: Date, endDate: Date): Date[];
