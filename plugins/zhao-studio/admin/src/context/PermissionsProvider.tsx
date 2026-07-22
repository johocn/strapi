// admin/src/context/PermissionsProvider.tsx
// 内部轻量版 PermissionsProvider：直接调用 zhao-auth 后端 /api/zhao-auth/v1/admin/me
// 跨插件 admin 代码无法直接 import（zhao-auth package.json 未导出 ./admin 路径），
// 因此在 zhao-studio 内部复制一份 Provider/Hook，复用同一后端 API。
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/zhao-auth/v1/admin';

async function fetchMyInfo() {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to fetch me: ${res.status}`);
  return res.json();
}

export interface PermissionsContextValue {
  permissions: string[];
  channelScope: { all: boolean; channelIds: string[] };
  tenant: { documentId: string } | null;
  user: { id: number; username: string; zhaoRoles: string[] } | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  hasPermission: (action: string) => boolean;
}

const defaultContext: PermissionsContextValue = {
  permissions: [],
  channelScope: { all: false, channelIds: [] },
  tenant: null,
  user: null,
  loading: true,
  error: null,
  refresh: () => {},
  hasPermission: () => false,
};

const PermissionsContext = createContext<PermissionsContextValue>(defaultContext);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<Omit<PermissionsContextValue, 'hasPermission' | 'refresh'>>({
    permissions: [],
    channelScope: { all: false, channelIds: [] },
    tenant: null,
    user: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchMyInfo();
      setState({
        permissions: data.permissions || [],
        channelScope: data.channelScope || { all: false, channelIds: [] },
        tenant: data.tenant || null,
        user: data.user || null,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: err }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasPermission = useCallback(
    (action: string) => state.permissions.includes(action),
    [state.permissions]
  );

  return (
    <PermissionsContext.Provider value={{ ...state, refresh: load, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const useMyPermissions = () => useContext(PermissionsContext);
export default PermissionsProvider;
