'use strict';

export default {
  routes: [
    // 产品列表
    {
      method: 'GET',
      path: '/v1/wealth/products',
      handler: 'product.list',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 产品详情
    {
      method: 'GET',
      path: '/v1/wealth/products/:id',
      handler: 'product.detail',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 净值时序
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/nav',
      handler: 'nav.timeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 年化快照时序
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/annual-snapshot',
      handler: 'annual.snapshotTimeSeries',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 年度收益列表
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/yearly-return',
      handler: 'annual.yearlyReturns',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
    // 推荐产品列表
    {
      method: 'GET',
      path: '/v1/wealth/recommend',
      handler: 'recommend.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 客户自选列表
    {
      method: 'GET',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.list',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 添加自选
    {
      method: 'POST',
      path: '/v1/wealth/customer-products',
      handler: 'customer-product.add',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 删除自选
    {
      method: 'DELETE',
      path: '/v1/wealth/customer-products/:id',
      handler: 'customer-product.remove',
      config: {
        policies: ['plugin::zhao-auth.is-authenticated'],
      },
    },
    // 风险指标查询
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/risk-metrics',
      handler: 'risk-metric.getMetrics',
      config: {
        policies: ['plugin::zhao-auth.has-channel-access'],
      },
    },
  ],
};