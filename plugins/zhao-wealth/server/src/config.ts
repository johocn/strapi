'use strict';

export default {
  // 夏普比率的无风险利率（默认 2%，可通过环境变量覆盖）
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  // 计算周期列表
  riskMetricPeriods: ['m1', 'm3', 'm6', 'y1'] as const,
  // 批量计算并发数
  riskMetricBatchConcurrency: 5,

  // 自适应评分权重配置
  // key 格式: productType 或 productType:operationMode
  // 当 productType:operationMode 存在时优先使用，否则回退到 productType
  scoreWeights: {
    'bank-wealth:daily-open':  { returns: 0.50, volatility: 0.15, drawdown: 0.05, peerRank: 0.30 },
    'bank-wealth:fixed-term':  { returns: 0.30, volatility: 0.25, drawdown: 0.25, peerRank: 0.20 },
    'bank-wealth:closed':      { returns: 0.30, volatility: 0.25, drawdown: 0.25, peerRank: 0.20 },
    'bank-wealth':             { returns: 0.30, volatility: 0.25, drawdown: 0.25, peerRank: 0.20 },
    'money-fund':              { returns: 0.40, volatility: 0.10, drawdown: 0.00, peerRank: 0.50 },
    'stock-fund':              { returns: 0.25, volatility: 0.30, drawdown: 0.30, peerRank: 0.15 },
    'bond-fund':               { returns: 0.30, volatility: 0.25, drawdown: 0.25, peerRank: 0.20 },
    'mixed-fund':              { returns: 0.25, volatility: 0.30, drawdown: 0.30, peerRank: 0.15 },
  } as Record<string, { returns: number; volatility: number; drawdown: number; peerRank: number }>,

  // 星级阈值
  starThresholds: {
    five: 90,
    four: 75,
    three: 60,
    two: 40,
  } as Record<string, number>,
};
