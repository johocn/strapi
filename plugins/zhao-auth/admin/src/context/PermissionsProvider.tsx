// admin/src/context/PermissionsProvider.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchMyInfo } from '../api';

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
