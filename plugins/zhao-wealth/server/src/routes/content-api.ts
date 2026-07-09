'use strict';

export default () => ({
  type: 'content-api' as const,
  routes: [
    {
      method: 'GET',
      path: '/v1/wealth/products',
      handler: 'product.list',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id',
      handler: 'product.detail',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/nav',
      handler: 'nav.timeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/annual-snapshot',
      handler: 'annual.snapshotTimeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/yearly-return',
      handler: 'annual.yearlyReturns',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/recommend',
      handler: 'recommend.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.add',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    {
      method: 'DELETE',
      path: '/v1/wealth/customer-products/:id',
      handler: 'customer-product.remove',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/risk-metrics',
      handler: 'risk-metric.getMetrics',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access', 'plugin::zhao-auth.has-tenant-access'],
      },
    },
  ],
});
