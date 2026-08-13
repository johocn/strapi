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
    // === 评分相关 ===
    {
      method: 'GET',
      path: '/v1/wealth/scores/leaderboard',
      handler: 'scoring.leaderboard',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/scores',
      handler: 'scoring.breakdown',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/scores/recalculate',
      handler: 'scoring.recalculate',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    // === 组合方案 ===
    {
      method: 'GET',
      path: '/v1/wealth/portfolio-plans',
      handler: 'portfolio.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/portfolio-plans',
      handler: 'portfolio.create',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/portfolio-plans/:id',
      handler: 'portfolio.detail',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'PUT',
      path: '/v1/wealth/portfolio-plans/:id',
      handler: 'portfolio.update',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'DELETE',
      path: '/v1/wealth/portfolio-plans/:id',
      handler: 'portfolio.remove',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/portfolio-plans/:id/performance',
      handler: 'portfolio.performance',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/portfolio-plans/:id/export',
      handler: 'portfolio.export',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    // === 预约咨询 ===
    {
      method: 'POST',
      path: '/v1/wealth/consultations',
      handler: 'consultation.create',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/consultations',
      handler: 'consultation.list',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'POST',
      path: '/v1/wealth/consultations/:id/cancel',
      handler: 'consultation.cancel',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
    {
      method: 'GET',
      path: '/v1/wealth/products/:id/risk-disclosure',
      handler: 'consultation.disclosure',
      config: {
        auth: false,
        policies: ['plugin::zhao-sso.sso-authenticated'],
      },
    },
  ],
});
