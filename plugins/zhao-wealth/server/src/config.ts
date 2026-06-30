'use strict';

export default {
  // 夏普比率的无风险利率（默认 2%，可通过环境变量覆盖）
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  // 计算周期列表
  riskMetricPeriods: ['1m', '3m', '6m', '1y'] as const,
  // 批量计算并发数
  riskMetricBatchConcurrency: 5,
};
