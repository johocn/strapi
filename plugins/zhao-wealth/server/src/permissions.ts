'use strict';

export default {
  // 插件权限定义
  'wealth-product': {
    actions: ['find', 'findOne', 'create', 'update', 'delete'],
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
};