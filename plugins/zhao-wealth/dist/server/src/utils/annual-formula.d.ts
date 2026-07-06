/**
 * 净值复利年化计算
 * 公式: 年化 = (期末净值/期初净值)^(365/区间自然日天数) - 1
 */
export declare function calculateAnnualReturn(startNav: number, endNav: number, naturalDays: number): number | null;
/**
 * 货币基金年化计算（万份收益单利）
 * 公式: 年化 = (周期万份收益总和 ÷ 周期自然天数) × 365 ÷ 10000
 */
export declare function calculateMoneyFundAnnual(totalIncome: number, naturalDays: number): number | null;
/**
 * 年度收益计算
 */
export declare function calculateYearlyReturn(startNav: number, endNav: number, year: number, productType: string): {
    annualReturn: number | null;
    baseDays: number;
};
/**
 * 判断是否为短期估算值（自然日天数 < 7）
 */
export declare function isEstimateValue(naturalDays: number): boolean;
