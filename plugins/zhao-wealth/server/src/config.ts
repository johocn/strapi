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
  // 注：同类排名样本过小时无统计意义，权重已归零（peerRank: 0）
  scoreWeights: {
    'bank-wealth:daily-open':  { returns: 0.70, volatility: 0.20, drawdown: 0.10, peerRank: 0.00 },
    'bank-wealth:fixed-term':  { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'bank-wealth:closed':      { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'bank-wealth':             { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'money-fund':              { returns: 0.70, volatility: 0.30, drawdown: 0.00, peerRank: 0.00 },
    'money-wealth':            { returns: 0.80, volatility: 0.20, drawdown: 0.00, peerRank: 0.00 },
    'stock-fund':              { returns: 0.40, volatility: 0.30, drawdown: 0.30, peerRank: 0.00 },
    'bond-fund':               { returns: 0.50, volatility: 0.25, drawdown: 0.25, peerRank: 0.00 },
    'mixed-fund':              { returns: 0.40, volatility: 0.30, drawdown: 0.30, peerRank: 0.00 },
  } as Record<string, { returns: number; volatility: number; drawdown: number; peerRank: number }>,

  // operation_mode 生产值与权重键的别名映射（数据为中文/简写，config 键为英文规范值）
  operationModeAliases: {
    '开放式净值型': 'daily-open',
    '封闭式': 'closed',
    '定期开放': 'fixed-term',
  },

  // 绝对评分标尺（不依赖同类样本量，用于将指标映射到 0-100 分）
  // returnScale: 年化收益率达该值即满分（6% 年化 = 100 分）
  // volatilityScale: 年化波动率达该值即 0 分（10% 波动 = 0 分）
  // drawdownScale: 最大回撤达该值即 0 分（-5% 回撤 = 0 分）
  scoreScales: {
    returnScale: 0.06,
    volatilityScale: 0.10,
    drawdownScale: 0.05,
    // 按产品类型覆盖波动率标尺（银行理财/货币类天然低波动，全局 0.10 按股票基金定标会失真）
    volatilityScaleByType: {
      'bank-wealth': 0.03,
      'money-fund': 0.02,
      'money-wealth': 0.02,
    },
    // 按产品类型细分收益标尺（货币类/银行理财正常年化低，全局 6% 按股基定标会失真）
    returnScaleByType: {
      'money-fund': 0.025,
      'money-wealth': 0.025,
      'bank-wealth': 0.05,
      'bond-fund': 0.10,
      'mixed-fund': 0.10,
      'stock-fund': 0.15,
    },
  },

  // 星级阈值
  starThresholds: {
    five: 90,
    four: 75,
    three: 60,
    two: 40,
  } as Record<string, number>,
};
