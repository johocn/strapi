'use strict';

/**
 * 净值复利年化计算
 * 公式: 年化 = (期末净值/期初净值)^(365/区间自然日天数) - 1
 */
export function calculateAnnualReturn(
  startNav: number | string,
  endNav: number | string,
  naturalDays: number
): number | null {
  // 显式转换为 Number（PostgreSQL numeric 可能返回字符串）
  const start = Number(startNav);
  const end = Number(endNav);

  // 边界检查
  if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
    return null;
  }

  if (isNaN(naturalDays) || naturalDays <= 0) {
    return null;
  }

  const ratio = end / start;
  const annualReturn = Math.pow(ratio, 365 / naturalDays) - 1;

  if (isNaN(annualReturn) || !isFinite(annualReturn)) {
    return null;
  }

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
  if (isNaN(totalIncome) || isNaN(naturalDays) || naturalDays <= 0) {
    return null;
  }

  const avgIncome = totalIncome / naturalDays;
  const annualReturn = avgIncome * 365 / 10000;

  if (isNaN(annualReturn) || !isFinite(annualReturn)) {
    return null;
  }

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
  // P2修复：根据年份判断闰年，原代码两分支均为 365
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const yearDays = isLeapYear ? 366 : 365;

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