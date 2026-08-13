'use strict';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * 管理后台路由：所有 admin-api 路由均使用 zhao-auth 的 is-authenticated 策略
 * 验证 SSO token（与 zhao-course 等 zhao-* 插件保持一致）。
 * auth: false 关闭 Strapi 默认 content-api 认证（要求 Strapi admin token），
 * 改用自定义策略验证前端传入的 SSO Bearer token。
 */
const adminRoute = (method: Method, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: {
    auth: false,
    policies: ['plugin::zhao-auth.is-authenticated'],
  },
});

export default () => ({
  type: 'content-api' as const,
  routes: [
    // ===== 公司管理 =====
    adminRoute('GET', '/v1/admin/companies', 'admin-api.companiesList'),
    adminRoute('GET', '/v1/admin/companies/:id', 'admin-api.companyDetail'),
    adminRoute('POST', '/v1/admin/companies', 'admin-api.companyCreate'),
    adminRoute('PUT', '/v1/admin/companies/:id', 'admin-api.companyUpdate'),
    adminRoute('DELETE', '/v1/admin/companies/:id', 'admin-api.companyDelete'),

    // ===== 产品管理 =====
    adminRoute('GET', '/v1/admin/products', 'admin-api.productsList'),
    adminRoute('GET', '/v1/admin/products/:id', 'admin-api.productDetail'),
    adminRoute('POST', '/v1/admin/products', 'admin-api.productCreate'),
    adminRoute('PUT', '/v1/admin/products/:id', 'admin-api.productUpdate'),
    adminRoute('DELETE', '/v1/admin/products/:id', 'admin-api.productDelete'),

    // ===== 采集配置 =====
    adminRoute('GET', '/v1/admin/collect-configs', 'admin-api.collectConfigsList'),
    adminRoute('PUT', '/v1/admin/collect-configs/:id', 'admin-api.collectConfigUpdate'),

    // ===== 批量采集 =====
    adminRoute('POST', '/v1/admin/collect/trigger', 'collect.trigger'),
    adminRoute('GET', '/v1/admin/collect/status', 'collect.status'),

    // ===== 净值数据 =====
    adminRoute('GET', '/v1/admin/products/:id/nav', 'admin-api.navDataList'),
    adminRoute('POST', '/v1/admin/products/:id/nav', 'admin-api.navDataCreate'),
    adminRoute('PUT', '/v1/admin/nav/:id', 'admin-api.navDataUpdate'),

    // ===== 年化重算 =====
    adminRoute('POST', '/v1/admin/recalculate', 'collect.recalculate'),

    // ===== 推荐配置 =====
    adminRoute('GET', '/v1/admin/recommend-configs', 'admin-api.recommendConfigsList'),
    adminRoute('POST', '/v1/admin/recommend-configs', 'admin-api.recommendConfigCreate'),
    adminRoute('PUT', '/v1/admin/recommend-configs/:id', 'admin-api.recommendConfigUpdate'),
    adminRoute('DELETE', '/v1/admin/recommend-configs/:id', 'admin-api.recommendConfigDelete'),

    // ===== 统计 =====
    adminRoute('GET', '/v1/admin/stats', 'admin-api.stats'),
    adminRoute('GET', '/v1/admin/stats/overview', 'admin-api.statsOverview'),
    adminRoute('GET', '/v1/admin/stats/anomalies', 'admin-api.statsAnomalies'),

    // ===== 风险指标 =====
    adminRoute('POST', '/v1/admin/recalculate-risk-metric', 'risk-metric.recalculate'),
    adminRoute('GET', '/v1/admin/risk-metrics/aggregate', 'risk-metric.adminAggregate'),
    adminRoute('GET', '/v1/admin/risk-metrics/trend', 'risk-metric.adminTrend'),
    adminRoute('GET', '/v1/admin/risk-metrics/peers', 'risk-metric.adminPeers'),

    // ===== 产品采集（双源采集 + 中国理财网校验） =====
    adminRoute('POST', '/v1/admin/products/collect', 'admin-api.collect'),
    adminRoute('POST', '/v1/admin/products/collect/confirm', 'admin-api.collectConfirm'),

    // ===== 合规披露 =====
    adminRoute('GET', '/v1/admin/disclosures', 'disclosure.adminList'),
    adminRoute('POST', '/v1/admin/disclosures', 'disclosure.adminCreate'),
    adminRoute('PUT', '/v1/admin/disclosures/:id', 'disclosure.adminUpdate'),
    adminRoute('DELETE', '/v1/admin/disclosures/:id', 'disclosure.adminDelete'),
  ],
});
