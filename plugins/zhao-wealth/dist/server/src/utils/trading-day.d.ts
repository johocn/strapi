/**
 * 判断是否为交易日
 */
export declare function isTradingDay(date: Date): boolean;
/**
 * 获取指定日期往前N个交易日
 */
export declare function getPreviousTradingDay(currentDate: Date, tradingDaysCount: number): Date | null;
/**
 * 获取两个日期之间的自然日天数（不含起始日，含结束日）
 */
export declare function getNaturalDays(startDate: Date, endDate: Date): number;
/**
 * 获取指定日期范围内的所有交易日
 */
export declare function getTradingDays(startDate: Date, endDate: Date): Date[];
