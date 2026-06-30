'use strict';

export default {
  // 夏普比率的无风险利率（默认 2%，可通过环境变量覆盖）
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  // 计算周期列表
  riskMetricPeriods: ['m1', 'm3', 'm6', 'y1'] as const,
  // 批量计算并发数
  riskMetricBatchConcurrency: 5,
};
