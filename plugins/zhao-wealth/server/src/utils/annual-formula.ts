'use strict';

/**
 * 净值复利年化计算
 * 公式: 年化 = (期末净值/期初净值)^(365/区间自然日天数) - 1
 */
export function calculateAnnualReturn(
  startNav: number,
  endNav: number,
  naturalDays: number
): number | null {
  // 边界检查
  if (startNav <= 0 || endNav <= 0) {
    return null;
  }

  if (naturalDays <= 0) {
    return null;
  }

  const ratio = endNav / startNav;
  const annualReturn = Math.pow(ratio, 365 / naturalDays) - 1;

  // 保留6位小数
  return Math.round(annualReturn * 1000000) / 1000000;
}

/**
 * 货币基金年化计算（万份收益单利）
 * 公式: 年化 = (周期万份收益总和 ÷ 周期自然天数) × 365 ÷ 10000
 */
export function calculateMoneyFundAnnual(
  totalIncome: number,
  naturalDays: number
): number | null {
  if (naturalDays <= 0) {
    return null;
  }

  const avgIncome = totalIncome / naturalDays;
  const annualReturn = avgIncome * 365 / 10000;

  return Math.round(annualReturn * 1000000) / 1000000;
}

/**
 * 年度收益计算
 */
export function calculateYearlyReturn(
  startNav: number,
  endNav: number,
  year: number,
  productType: string
): { annualReturn: number | null; baseDays: number } {
  // 判断是否为完整年度
  const yearDays = productType === 'money-fund' ? 365 : 365;

  const annualReturn = calculateAnnualReturn(startNav, endNav, yearDays);

  return {
    annualReturn,
    baseDays: yearDays,
  };
}

/**
 * 判断是否为短期估算值（自然日天数 < 7）
 */
export function isEstimateValue(naturalDays: number): boolean {
  return naturalDays < 7;
}