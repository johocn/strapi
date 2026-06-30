'use strict';

export default {
  routes: [
    // ===== 公司管理 =====
    {
      method: 'GET',
      path: '/companies',
      handler: 'admin-api.companiesList',
    },
    {
      method: 'GET',
      path: '/companies/:id',
      handler: 'admin-api.companyDetail',
    },
    {
      method: 'POST',
      path: '/companies',
      handler: 'admin-api.companyCreate',
    },
    {
      method: 'PUT',
      path: '/companies/:id',
      handler: 'admin-api.companyUpdate',
    },
    {
      method: 'DELETE',
      path: '/companies/:id',
      handler: 'admin-api.companyDelete',
    },

    // ===== 产品管理 =====
    {
      method: 'GET',
      path: '/products',
      handler: 'admin-api.productsList',
    },
    {
      method: 'GET',
      path: '/products/:id',
      handler: 'admin-api.productDetail',
    },
    {
      method: 'POST',
      path: '/products',
      handler: 'admin-api.productCreate',
    },
    {
      method: 'PUT',
      path: '/products/:id',
      handler: 'admin-api.productUpdate',
    },
    {
      method: 'DELETE',
      path: '/products/:id',
      handler: 'admin-api.productDelete',
    },

    // ===== 采集配置 =====
    {
      method: 'GET',
      path: '/collect-configs',
      handler: 'admin-api.collectConfigsList',
    },
    {
      method: 'PUT',
      path: '/collect-configs/:id',
      handler: 'admin-api.collectConfigUpdate',
    },
    {
      method: 'POST',
      path: '/collect/trigger',
      handler: 'collect.trigger',
    },
    {
      method: 'GET',
      path: '/collect/status',
      handler: 'collect.status',
    },

    // ===== 净值管理 =====
    {
      method: 'GET',
      path: '/products/:id/nav',
      handler: 'admin-api.navDataList',
    },
    {
      method: 'POST',
      path: '/products/:id/nav',
      handler: 'admin-api.navDataCreate',
    },
    {
      method: 'PUT',
      path: '/nav/:id',
      handler: 'admin-api.navDataUpdate',
    },

    // ===== 重算 =====
    {
      method: 'POST',
      path: '/recalculate',
      handler: 'collect.recalculate',
    },

    // ===== 推荐配置 =====
    {
      method: 'GET',
      path: '/recommend-configs',
      handler: 'admin-api.recommendConfigsList',
    },
    {
      method: 'POST',
      path: '/recommend-configs',
      handler: 'admin-api.recommendConfigCreate',
    },
    {
      method: 'PUT',
      path: '/recommend-configs/:id',
      handler: 'admin-api.recommendConfigUpdate',
    },
    {
      method: 'DELETE',
      path: '/recommend-configs/:id',
      handler: 'admin-api.recommendConfigDelete',
    },

    // ===== 客户自选 =====
    {
      method: 'GET',
      path: '/customer-products',
      handler: 'admin-api.customerProductsList',
    },

    // ===== 统计 =====
    {
      method: 'GET',
      path: '/stats',
      handler: 'admin-api.stats',
    },

    // 风险指标重算
    {
      method: 'POST',
      path: '/recalculate-risk-metric',
      handler: 'risk-metric.recalculate',
    },

    // 统计聚合（仪表盘）
    {
      method: 'GET',
      path: '/stats/overview',
      handler: 'admin-api.statsOverview',
    },
    {
      method: 'GET',
      path: '/stats/anomalies',
      handler: 'admin-api.statsAnomalies',
    },

    // 指标中心聚合
    {
      method: 'GET',
      path: '/risk-metrics/admin/aggregate',
      handler: 'risk-metric.adminAggregate',
    },
    {
      method: 'GET',
      path: '/risk-metrics/admin/trend',
      handler: 'risk-metric.adminTrend',
    },
    {
      method: 'GET',
      path: '/risk-metrics/admin/peers',
      handler: 'risk-metric.adminPeers',
    },
  ],
};