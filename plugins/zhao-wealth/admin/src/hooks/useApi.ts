import { useFetchClient } from '@strapi/strapi/admin';

const PLUGIN_ID = 'zhao-wealth';

export const useApi = () => {
  const { get, post, put, del } = useFetchClient();

  const call = async (method: 'get' | 'post' | 'put' | 'del', path: string, data?: any, params?: any) => {
    const config: any = {};
    if (params) config.params = params;
    if (data) config.data = data;
    const res = await (method === 'get' ? get(path, config) : method === 'post' ? post(path, config) : method === 'put' ? put(path, config) : del(path, config));
    return res.data;
  };

  return {
    // 公司管理
    getCompanies: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/companies`, undefined, params),
    getCompany: (id: number) => call('get', `/admin/plugins/${PLUGIN_ID}/companies/${id}`),
    createCompany: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/companies`, data),
    updateCompany: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/companies/${id}`, data),
    deleteCompany: (id: number) => call('del', `/admin/plugins/${PLUGIN_ID}/companies/${id}`),

    // 产品管理
    getProducts: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/products`, undefined, params),
    getProduct: (id: number) => call('get', `/admin/plugins/${PLUGIN_ID}/products/${id}`),
    createProduct: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products`, data),
    updateProduct: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/products/${id}`, data),
    deleteProduct: (id: number) => call('del', `/admin/plugins/${PLUGIN_ID}/products/${id}`),

    // 采集配置
    getCollectConfigs: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/collect-configs`, undefined, params),
    updateCollectConfig: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/collect-configs/${id}`, data),
    triggerCollect: (productId?: number) => call('post', `/admin/plugins/${PLUGIN_ID}/collect/trigger`, { productId }),
    getCollectStatus: (productId?: number) => call('get', `/admin/plugins/${PLUGIN_ID}/collect/status`, undefined, { productId }),

    // 净值管理
    getNavData: (productId: number, params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, undefined, params),
    createNavData: (productId: number, data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, data),
    updateNavData: (id: number, data: any) => call('put', `/admin/plugins/${PLUGIN_ID}/nav/${id}`, data),

    // 重算
    triggerRecalculate: (params?: any) => call('post', `/admin/plugins/${PLUGIN_ID}/recalculate`, params),
    recalculateRiskMetric: (params?: any) => call('post', `/admin/plugins/${PLUGIN_ID}/recalculate-risk-metric`, params),

    // 客户自选
    getCustomerProducts: (params?: any) => call('get', `/admin/plugins/${PLUGIN_ID}/customer-products`, undefined, params),

    // 统计（仪表盘）
    getStatsOverview: () => call('get', `/admin/plugins/${PLUGIN_ID}/stats/overview`),
    getStatsAnomalies: (limit = 10) => call('get', `/admin/plugins/${PLUGIN_ID}/stats/anomalies`, undefined, { limit }),

    // 指标中心
    getMetricAggregate: (productId: number, period: string) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/aggregate`, undefined, { productId, period }),
    getMetricTrend: (productId: number) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/trend`, undefined, { productId }),
    getMetricPeers: (period: string, metricName: string, limit = 50) => call('get', `/admin/plugins/${PLUGIN_ID}/risk-metrics/admin/peers`, undefined, { period, metricName, limit }),

    // 采集与校验
    collectProduct: (source: string, query: string) => call('post', `/admin/plugins/${PLUGIN_ID}/products/collect`, { source, query }),
    collectConfirm: (data: any) => call('post', `/admin/plugins/${PLUGIN_ID}/products/collect/confirm`, data),
  };
};
