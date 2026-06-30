// 产品类型
export const PRODUCT_TYPES: Record<string, string> = {
  'bank-wealth': '银行理财',
  'stock-fund': '股票基金',
  'bond-fund': '债券基金',
  'mixed-fund': '混合基金',
  'money-fund': '货币基金',
};

// 风险等级
export const RISK_LEVELS: Record<string, string> = {
  R1: '低风险',
  R2: '中低风险',
  R3: '中风险',
  R4: '中高风险',
  R5: '高风险',
};

// 期限类型
export const TERM_TYPES: Record<string, string> = {
  short: '短期',
  medium: '中期',
  long: '长期',
};

// 公司类型
export const COMPANY_TYPES: Record<string, string> = {
  bank: '银行',
  'bank-subsidiary': '理财子公司',
};

// 采集方式
export const COLLECT_METHODS: Record<string, string> = {
  'web-crawler': '网页爬虫',
  'zip-pdf': 'ZIP+PDF解析',
  manual: '手动录入',
  api: '三方API',
};

// 采集状态
export const COLLECT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待采集', color: 'warning' },
  success: { label: '成功', color: 'success' },
  failed: { label: '失败', color: 'error' },
};

// 指标周期
export const METRIC_PERIODS: Record<string, string> = {
  m1: '近1月',
  m3: '近3月',
  m6: '近6月',
  y1: '近1年',
};

// 指标名称
export const METRIC_NAMES: Record<string, string> = {
  volatility: '波动率',
  maxDrawdown: '最大回撤',
  sharpe: '夏普比率',
  rankPercentile: '同类排名百分位',
};

// 推荐标签
export const RECOMMEND_TAGS = [
  { label: '稳健型', value: '稳健型' },
  { label: '高流动性', value: '高流动性' },
  { label: '新客专享', value: '新客专享' },
  { label: '进取型', value: '进取型' },
];
