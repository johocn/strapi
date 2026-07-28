import { useFetchClient } from '@strapi/strapi/admin';

const PLUGIN_ID = 'zhao-wealth';

export const useApi = () => {
  const { get, post, put, del } = useFetchClient();

  const call = async (method: 'get' | 'post' | 'put' | 'del', path: string, data?: any, params?: any) => {
    const config: any = {};
    if (params) config.params = params;
    if (data) config.data = data;
    const res = await (method === 'get' ? get(path, config) : method === 'post' ? post(path, config) : method === 'put' ? put(path, config) : del(path, config));
    // 拆 envelope: { code, msg, data }
    // HTTP 200 但业务码非 200 时抛错，便于前端 try/catch 捕获 msg
    const body = res.data || {};
    if (body.code !== undefined && body.code !== 200) {
      throw new Error(body.msg || `请求失败 (${body.code})`);
    }
    // 业务成功：返回内层 data；非 envelope 响应则原样返回
    return body.data !== undefined ? body.data : body;
  };

  // Strapi v5 插件 admin 路由挂载在 `/{pluginName}/{path}`，
  // 不是 `/admin/plugins/{pluginName}/{path}`（后者是 SPA 前端路由路径，会被 Vite SPA fallback 拦截返回 HTML）
  const P = `/${PLUGIN_ID}`;

  return {
    // 公司管理
    getCompanies: (params?: any) => call('get', `${P}/companies`, undefined, params),
    getCompany: (id: number) => call('get', `${P}/companies/${id}`),
    createCompany: (data: any) => call('post', `${P}/companies`, data),
    updateCompany: (id: number, data: any) => call('put', `${P}/companies/${id}`, data),
    deleteCompany: (id: number) => call('del', `${P}/companies/${id}`),

    // 产品管理
    getProducts: (params?: any) => call('get', `${P}/products`, undefined, params),
    getProduct: (id: number) => call('get', `${P}/products/${id}`),
    createProduct: (data: any) => call('post', `${P}/products`, data),
    updateProduct: (id: number, data: any) => call('put', `${P}/products/${id}`, data),
    deleteProduct: (id: number) => call('del', `${P}/products/${id}`),

    // 采集配置
    getCollectConfigs: (params?: any) => call('get', `${P}/collect-configs`, undefined, params),
    updateCollectConfig: (id: number, data: any) => call('put', `${P}/collect-configs/${id}`, data),
    triggerCollect: (productId?: number) => call('post', `${P}/collect/trigger`, { productId }),
    getCollectStatus: (productId?: number) => call('get', `${P}/collect/status`, undefined, { productId }),

    // 净值管理
    getNavData: (productId: number, params?: any) => call('get', `${P}/products/${productId}/nav`, undefined, params),
    createNavData: (productId: number, data: any) => call('post', `${P}/products/${productId}/nav`, data),
    updateNavData: (id: number, data: any) => call('put', `${P}/nav/${id}`, data),

    // 重算
    triggerRecalculate: (params?: any) => call('post', `${P}/recalculate`, params),
    recalculateRiskMetric: (params?: any) => call('post', `${P}/recalculate-risk-metric`, params),

    // 客户自选
    getCustomerProducts: (params?: any) => call('get', `${P}/customer-products`, undefined, params),

    // 统计（仪表盘）
    getStatsOverview: () => call('get', `${P}/stats/overview`),
    getStatsAnomalies: (limit = 10) => call('get', `${P}/stats/anomalies`, undefined, { limit }),

    // 指标中心
    getMetricAggregate: (productId: number, period: string) => call('get', `${P}/risk-metrics/admin/aggregate`, undefined, { productId, period }),
    getMetricTrend: (productId: number) => call('get', `${P}/risk-metrics/admin/trend`, undefined, { productId }),
    getMetricPeers: (period: string, metricName: string, limit = 50) => call('get', `${P}/risk-metrics/admin/peers`, undefined, { period, metricName, limit }),

    // 采集与校验
    collectProduct: (source: string, query: string) => call('post', `${P}/products/collect`, { source, query }),
    collectConfirm: (data: any) => call('post', `${P}/products/collect/confirm`, data),
  };
};
