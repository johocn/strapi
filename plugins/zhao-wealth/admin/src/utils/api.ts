import { useFetchClient } from "@strapi/strapi/admin";

const PLUGIN_ID = "zhao-wealth";

export const useApi = () => {
  const { get, post, put, del } = useFetchClient();

  // 公司管理
  const getCompanies = async (params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/companies`, { params });
    return response.data;
  };

  const getCompany = async (id: number) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/companies/${id}`);
    return response.data;
  };

  const createCompany = async (data: any) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/companies`, data);
    return response.data;
  };

  const updateCompany = async (id: number, data: any) => {
    const response = await put(`/admin/plugins/${PLUGIN_ID}/companies/${id}`, data);
    return response.data;
  };

  const deleteCompany = async (id: number) => {
    const response = await del(`/admin/plugins/${PLUGIN_ID}/companies/${id}`);
    return response.data;
  };

  // 产品管理
  const getProducts = async (params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/products`, { params });
    return response.data;
  };

  const getProduct = async (id: number) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
    return response.data;
  };

  const createProduct = async (data: any) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/products`, data);
    return response.data;
  };

  const updateProduct = async (id: number, data: any) => {
    const response = await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, data);
    return response.data;
  };

  const deleteProduct = async (id: number) => {
    const response = await del(`/admin/plugins/${PLUGIN_ID}/products/${id}`);
    return response.data;
  };

  // 采集配置
  const getCollectConfigs = async (params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/collect-configs`, { params });
    return response.data;
  };

  const updateCollectConfig = async (id: number, data: any) => {
    const response = await put(`/admin/plugins/${PLUGIN_ID}/collect-configs/${id}`, data);
    return response.data;
  };

  const triggerCollect = async (productId?: number) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/collect/trigger`, { productId });
    return response.data;
  };

  const getCollectStatus = async (productId?: number) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/collect/status`, { params: { productId } });
    return response.data;
  };

  // 净值管理
  const getNavData = async (productId: number, params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, { params });
    return response.data;
  };

  const createNavData = async (productId: number, data: any) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/products/${productId}/nav`, data);
    return response.data;
  };

  const updateNavData = async (id: number, data: any) => {
    const response = await put(`/admin/plugins/${PLUGIN_ID}/nav/${id}`, data);
    return response.data;
  };

  // 重算
  const triggerRecalculate = async (params?: any) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/recalculate`, params);
    return response.data;
  };

  // 推荐配置
  const getRecommendConfigs = async (params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/recommend-configs`, { params });
    return response.data;
  };

  const createRecommendConfig = async (data: any) => {
    const response = await post(`/admin/plugins/${PLUGIN_ID}/recommend-configs`, data);
    return response.data;
  };

  const updateRecommendConfig = async (id: number, data: any) => {
    const response = await put(`/admin/plugins/${PLUGIN_ID}/recommend-configs/${id}`, data);
    return response.data;
  };

  const deleteRecommendConfig = async (id: number) => {
    const response = await del(`/admin/plugins/${PLUGIN_ID}/recommend-configs/${id}`);
    return response.data;
  };

  // 客户自选
  const getCustomerProducts = async (params?: any) => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/customer-products`, { params });
    return response.data;
  };

  // 统计
  const getStats = async () => {
    const response = await get(`/admin/plugins/${PLUGIN_ID}/stats`);
    return response.data;
  };

  return {
    getCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getCollectConfigs,
    updateCollectConfig,
    triggerCollect,
    getCollectStatus,
    getNavData,
    createNavData,
    updateNavData,
    triggerRecalculate,
    getRecommendConfigs,
    createRecommendConfig,
    updateRecommendConfig,
    deleteRecommendConfig,
    getCustomerProducts,
    getStats,
  };
};