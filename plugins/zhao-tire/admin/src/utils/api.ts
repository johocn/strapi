import { useCallback } from "react";
import { isFetchError, useFetchClient } from "@strapi/strapi/admin";

export const API_BASE = "/api/zhao-tire/v1/admin";
export const ME_URL = `${API_BASE}/me`;
export const FULL_ROLES = ["strapi-super-admin", "tire-admin"];

export type Me = {
  id: number;
  roleCodes: string[];
};

export type PermissionState = {
  loading: boolean;
  me: Me | null;
  canFull: boolean;
  canStorage: boolean;
  canPayment: boolean;
  error?: string;
};

export const canFullAccess = (roleCodes: string[]): boolean =>
  roleCodes.some((code) => FULL_ROLES.includes(code));

export const canStorageAccess = (roleCodes: string[]): boolean =>
  canFullAccess(roleCodes) || roleCodes.includes("tire-warehouse");

export const canPaymentAccess = (roleCodes: string[]): boolean =>
  canFullAccess(roleCodes) || roleCodes.includes("tire-cashier");

export const errorMessage = (error: unknown): string => {
  if (isFetchError(error)) {
    const payload: any = (error as any).response?.data;
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.data?.message ||
      error.message;
    const code = payload?.code || payload?.error?.name;
    return code ? `${message}（${code}）` : String(message);
  }
  if (error instanceof Error) return error.message;
  return String(error);
};

const readCookie = (name: string): string | null => {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const getAdminToken = (): string | null => {
  try {
    const raw = window.localStorage.getItem("jwtToken");
    if (raw) return JSON.parse(raw);
  } catch {
    // 忽略本地存储解析失败
  }
  return readCookie("jwtToken");
};

const backendUrl = (url: string): string => {
  const base = (window as any).strapi?.backendURL || "";
  return url.startsWith("http") ? url : `${base}${url}`;
};

const patchJson = async (url: string, body: any): Promise<any> => {
  const token = getAdminToken();
  const response = await fetch(backendUrl(url), {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.message || payload?.error?.message || `请求失败（${response.status}）`;
    throw new Error(message);
  }
  return payload;
};

export const absoluteMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  return url.startsWith("http") ? url : backendUrl(url);
};

export function useTireApi() {
  const { get, post, put, del } = useFetchClient();

  const getMe = useCallback(async (): Promise<Me> => {
    try {
      const { data } = await get(ME_URL);
      const payload: any = (data as any)?.data ?? data ?? {};
      return {
        id: Number(payload.id) || 0,
        roleCodes: Array.isArray(payload.roleCodes) ? payload.roleCodes : [],
      };
    } catch (error) {
      // 兼容未部署 /me 的场景，回退到原生用户接口
      const { data } = await get("/admin/users/me");
      const payload: any = (data as any)?.data ?? data ?? {};
      const roles = Array.isArray(payload.roles) ? payload.roles : [];
      return {
        id: Number(payload.id) || 0,
        roleCodes: roles
          .map((role: any) => String(role?.code || ""))
          .filter(Boolean),
      };
    }
  }, [get]);

  const listOrders = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/orders`, { params });
      return data as any;
    },
    [get]
  );

  const getOrder = useCallback(
    async (id: number) => {
      const { data } = await get(`${API_BASE}/orders/${id}`);
      return (data as any)?.data ?? (data as any);
    },
    [get]
  );

  const updateOrder = useCallback(
    async (id: number, body: any) => {
      const { data } = await patchJson(`${API_BASE}/orders/${id}`, body);
      return data as any;
    },
    []
  );

  const orderAction = useCallback(
    async (id: number, action: string, body: any = {}) => {
      const { data } = await post(`${API_BASE}/orders/${id}/${action}`, body);
      return data as any;
    },
    [post]
  );

  const submitOrderPhotos = useCallback(
    async (
      id: number,
      action: "inbound" | "outbound",
      files: File[],
      extra: Record<string, any> = {}
    ) => {
      const formData = new FormData();
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });
      files.forEach((file) => formData.append("photos", file));
      const { data } = await post(`${API_BASE}/orders/${id}/${action}`, formData);
      return data as any;
    },
    [post]
  );

  const exportOrders = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/orders/export.xlsx`, {
        params,
        responseType: "blob",
      });
      return data as unknown as Blob;
    },
    [get]
  );

  const listInventory = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/inventory`, { params });
      return data as any;
    },
    [get]
  );

  const listExpiring = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/inventory/expiring`, { params });
      return data as any;
    },
    [get]
  );

  const remindInventory = useCallback(
    async (ids: number[]) => {
      const { data } = await post(`${API_BASE}/inventory/remind`, { ids });
      return data as any;
    },
    [post]
  );

  const listCustomers = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/customers`, { params });
      return data as any;
    },
    [get]
  );

  const listCollection = useCallback(
    async (name: string) => {
      const { data } = await get(`${API_BASE}/${name}`);
      return ((data as any)?.data ?? data) || [];
    },
    [get]
  );

  const createCollection = useCallback(
    async (name: string, body: any) => {
      const { data } = await post(`${API_BASE}/${name}`, body);
      return data as any;
    },
    [post]
  );

  const updateCollection = useCallback(
    async (name: string, id: number, body: any) => {
      const { data } = await put(`${API_BASE}/${name}/${id}`, body);
      return data as any;
    },
    [put]
  );

  const removeCollection = useCallback(
    async (name: string, id: number) => {
      const { data } = await del(`${API_BASE}/${name}/${id}`);
      return data as any;
    },
    [del]
  );

  const getConfig = useCallback(async () => {
    const { data } = await get(`${API_BASE}/config`);
    return (data as any)?.data ?? data ?? {};
  }, [get]);

  const updateConfig = useCallback(
    async (body: any) => {
      const { data } = await put(`${API_BASE}/config`, body);
      return (data as any)?.data ?? (data as any);
    },
    [put]
  );

  const listSmsLogs = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/sms-logs`, { params });
      return data as any;
    },
    [get]
  );

  const updateSmsLog = useCallback(async (id: number, body: any) => {
    const payload = await patchJson(`${API_BASE}/sms-logs/${id}`, body);
    return payload;
  }, []);

  const listReferralCodes = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/referral-codes`, { params });
      return data as any;
    },
    [get]
  );

  const grantFreeToReferral = useCallback(
    async (id: number, count: number) => {
      const { data } = await post(`${API_BASE}/referral-codes/${id}/grant-free`, { count });
      return data as any;
    },
    [post]
  );

  const listPayments = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/payments`, { params });
      return data as any;
    },
    [get]
  );

  const confirmPayment = useCallback(
    async (id: number) => {
      const { data } = await post(`${API_BASE}/payments/${id}/confirm`, {});
      return data as any;
    },
    [post]
  );

  const listShareRecords = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/share-records`, { params });
      return data as any;
    },
    [get]
  );

  const exportShareRecords = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/share-records/export.csv`, {
        params,
        responseType: "blob",
      });
      return data as unknown as Blob;
    },
    [get]
  );

  const listRewards = useCallback(
    async (params: Record<string, any>) => {
      const { data } = await get(`${API_BASE}/rewards`, { params });
      return data as any;
    },
    [get]
  );

  const uploadImage = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("files", file);
      const { data } = await post("/upload", formData);
      const files = Array.isArray(data) ? data : [data];
      const uploaded = files.find(Boolean) || {};
      return {
        id: Number(uploaded.id) || 0,
        url: absoluteMediaUrl(uploaded.url),
        name: String(uploaded.name || file.name),
      };
    },
    [post]
  );

  return {
    getMe,
    listOrders,
    getOrder,
    updateOrder,
    orderAction,
    submitOrderPhotos,
    exportOrders,
    listInventory,
    listExpiring,
    remindInventory,
    listCustomers,
    listCollection,
    createCollection,
    updateCollection,
    removeCollection,
    getConfig,
    updateConfig,
    listSmsLogs,
    updateSmsLog,
    listReferralCodes,
    grantFreeToReferral,
    listPayments,
    confirmPayment,
    listShareRecords,
    exportShareRecords,
    listRewards,
    uploadImage,
  };
}

export type TireApi = ReturnType<typeof useTireApi>;
