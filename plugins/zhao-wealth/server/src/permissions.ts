'use strict';

export default {
  // 插件权限定义
  'wealth-product': {
    actions: ['find', 'findOne', 'create', 'update', 'delete', 'collect', 'collectConfirm'],
  },
  'wealth-nav': {
    actions: ['find', 'findOne', 'create', 'update'],
  },
  'wealth-collect-config': {
    actions: ['find', 'findOne', 'create', 'update', 'trigger', 'status'],
  },
  'wealth-recommend-config': {
    actions: ['find', 'findOne', 'create', 'update', 'delete'],
  },
  'wealth-customer-product': {
    actions: ['find', 'create', 'delete'],
  },
  // 新增：统计与风险指标 admin 接口权限
  'wealth-stats': {
    actions: ['overview', 'anomalies'],
  },
  'wealth-risk-metric': {
    actions: ['aggregate', 'trend', 'peers', 'recalculate'],
  },
};
