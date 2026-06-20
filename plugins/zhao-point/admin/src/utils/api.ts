import { useCallback } from "react";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const ADMIN_API = `/admin/plugins/${PLUGIN_ID}`;

export function usePointApi() {
  const { get, post, put, del } = useFetchClient();

  const getRecords = useCallback(async (params?: Record<string, any>) => {
    const { data } = await get(`${ADMIN_API}/point-records`, { params });
    return data;
  }, [get]);

  const adminAdjust = useCallback(async (body: any) => {
    const { data } = await post(`${ADMIN_API}/point-records/admin-adjust`, body);
    return data;
  }, [post]);

  const batchAdjust = useCallback(async (body: any) => {
    const { data } = await post(`${ADMIN_API}/point-records/batch-adjust`, body);
    return data;
  }, [post]);

  return { getRecords, adminAdjust, batchAdjust };
}

export function useRuleApi() {
  const { get, post, put, del } = useFetchClient();

  const getRules = useCallback(async (params?: Record<string, any>) => {
    const { data } = await get(`${ADMIN_API}/point-rules`, { params });
    return data;
  }, [get]);

  const createRule = useCallback(async (body: any) => {
    const { data } = await post(`${ADMIN_API}/point-rules`, body);
    return data;
  }, [post]);

  const updateRule = useCallback(async (action: string, body: any) => {
    const { data } = await put(`${ADMIN_API}/point-rules/${action}`, body);
    return data;
  }, [put]);

  const deleteRule = useCallback(async (action: string) => {
    const { data } = await del(`${ADMIN_API}/point-rules/${action}`);
    return data;
  }, [del]);

  return { getRules, createRule, updateRule, deleteRule };
}

export function useProductApi() {
  const { get, post, put, del } = useFetchClient();

  const getProducts = useCallback(async (params?: Record<string, any>) => {
    const { data } = await get(`${ADMIN_API}/products`, { params });
    return data;
  }, [get]);

  const createProduct = useCallback(async (body: any) => {
    const { data } = await post(`${ADMIN_API}/products`, body);
    return data;
  }, [post]);

  const updateProduct = useCallback(async (id: number, body: any) => {
    const { data } = await put(`${ADMIN_API}/products/${id}`, body);
    return data;
  }, [put]);

  const deleteProduct = useCallback(async (id: number) => {
    const { data } = await del(`${ADMIN_API}/products/${id}`);
    return data;
  }, [del]);

  const adjustStock = useCallback(async (id: number, delta: number) => {
    const { data } = await post(`${ADMIN_API}/products/${id}/stock`, { delta });
    return data;
  }, [post]);

  return { getProducts, createProduct, updateProduct, deleteProduct, adjustStock };
}

export function useRedemptionApi() {
  const { get, put } = useFetchClient();

  const getRedemptions = useCallback(async (params?: Record<string, any>) => {
    const { data } = await get(`${ADMIN_API}/point-redemptions`, { params });
    return data;
  }, [get]);

  const reviewRedemption = useCallback(async (id: number, body: any) => {
    const { data } = await put(`${ADMIN_API}/point-redemptions/${id}`, body);
    return data;
  }, [put]);

  return { getRedemptions, reviewRedemption };
}

export function useConfigApi() {
  const { get, put } = useFetchClient();

  const getConfig = useCallback(async () => {
    const { data } = await get(`${ADMIN_API}/config`);
    return data;
  }, [get]);

  const updateConfig = useCallback(async (body: any) => {
    const { data } = await put(`${ADMIN_API}/config`, body);
    return data;
  }, [put]);

  return { getConfig, updateConfig };
}

export function useVerificationApi() {
  const { get } = useFetchClient();

  const getVerifications = useCallback(async (params?: Record<string, any>) => {
    const { data } = await get(`${ADMIN_API}/verifications`, { params });
    return data;
  }, [get]);

  const getVerificationStats = useCallback(async (channelId?: number) => {
    const { data } = await get(`${ADMIN_API}/verifications/stats`, {
      params: channelId ? { channelId } : undefined,
    });
    return data;
  }, [get]);

  return { getVerifications, getVerificationStats };
}

export function useDashboardApi() {
  const { get } = useFetchClient();

  const getDashboard = useCallback(async () => {
    const { data } = await get(`${ADMIN_API}/dashboard`);
    return data;
  }, [get]);

  return { getDashboard };
}
