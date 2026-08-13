'use strict';

export default () => ({
  type: 'content-api' as const,
  routes: [
    {
      method: 'GET',
      path: '/v1/wealth/products',
      handler: 'product.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id',
      handler: 'product.detail',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/nav',
      handler: 'nav.timeSeries',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/annual-snapshot',
      handler: 'annual.snapshotTimeSeries',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/yearly-return',
      handler: 'annual.yearlyReturns',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/recommend',
      handler: 'recommend.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.add',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'DELETE',
      path: '/v1/wealth/customer-products/:id',
      handler: 'customer-product.remove',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/risk-metrics',
      handler: 'risk-metric.getMetrics',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/disclosure',
      handler: 'disclosure.getByProductType',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/compare',
      handler: 'compare.compare',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/holdings',
      handler: 'holding.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/holdings/:id',
      handler: 'holding.detail',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/holdings/:id/profit-trend',
      handler: 'holding.profitTrend',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/holdings',
      handler: 'holding.add',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'DELETE',
      path: '/v1/wealth/holdings/:id',
      handler: 'holding.remove',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
  ],
});
