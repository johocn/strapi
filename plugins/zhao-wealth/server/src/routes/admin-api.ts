'use strict';

export default () => ({
  type: 'admin' as const,
  routes: [
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
    {
      method: 'POST',
      path: '/recalculate',
      handler: 'collect.recalculate',
    },
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
    {
      method: 'GET',
      path: '/customer-products',
      handler: 'admin-api.customerProductsList',
    },
    {
      method: 'GET',
      path: '/stats',
      handler: 'admin-api.stats',
    },
    {
      method: 'POST',
      path: '/recalculate-risk-metric',
      handler: 'risk-metric.recalculate',
    },
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
    {
      method: 'POST',
      path: '/products/collect',
      handler: 'admin-api.collect',
    },
    {
      method: 'POST',
      path: '/products/collect/confirm',
      handler: 'admin-api.collectConfirm',
    },
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
});
