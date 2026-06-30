// 指标评级规则
export type RatingLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface RatingRule {
  level: RatingLevel;
  label: string;
  color: string;
}

// 波动率评级（越小越好）
export function rateVolatility(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  const abs = Math.abs(value);
  if (abs < 0.05) return { level: 'excellent', label: '优', color: 'success' };
  if (abs < 0.10) return { level: 'good', label: '良', color: 'blue' };
  if (abs < 0.20) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 最大回撤评级（越大越好，负数绝对值越小越好）
export function rateMaxDrawdown(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value > -0.05) return { level: 'excellent', label: '优', color: 'success' };
  if (value > -0.10) return { level: 'good', label: '良', color: 'blue' };
  if (value > -0.20) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 夏普比率评级（越大越好）
export function rateSharpe(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value > 1) return { level: 'excellent', label: '优', color: 'success' };
  if (value > 0.5) return { level: 'good', label: '良', color: 'blue' };
  if (value > 0) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 同类排名百分位评级（越小越好，表示排名越靠前）
export function rateRankPercentile(value: number | null): RatingRule {
  if (value === null) return { level: 'fair', label: '无数据', color: 'default' };
  if (value < 20) return { level: 'excellent', label: '优', color: 'success' };
  if (value < 50) return { level: 'good', label: '良', color: 'blue' };
  if (value < 80) return { level: 'fair', label: '中', color: 'warning' };
  return { level: 'poor', label: '差', color: 'error' };
}

// 格式化百分比显示
export function formatPercent(value: number | null, digits = 4): string {
  if (value === null) return '-';
  return (value * 100).toFixed(digits) + '%';
}
