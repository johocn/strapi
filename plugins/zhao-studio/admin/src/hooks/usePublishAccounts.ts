import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface PublishAccount {
  id: string;
  documentId?: string;
  name: string;
  platformId?: string;
  platform?: { documentId?: string; name?: string };
  platformName?: string;
  accountId?: string;
  accessToken?: string;
  refreshToken?: string;
  isActive?: boolean;
  config?: any;
}

const API_BASE = '/api/zhao-studio/v1/admin';

export const usePublishAccounts = () => {
  const [accounts, setAccounts] = React.useState<PublishAccount[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAccounts = React.useCallback(async (platformId?: string) => {
    setLoading(true);
    try {
      const query = platformId ? `?platformId=${encodeURIComponent(platformId)}` : '';
      const res = await fetch(`${API_BASE}/accounts${query}`);
      const json = await res.json();
      // 接口返回 { data: [...] }；平台过滤交给后端（关系按 documentId 过滤）
      const list = normalizeList<PublishAccount>(json?.data || []).map(a => ({
        ...a,
        platformName: a.platform?.name || a.platformName || '-',
      }));
      setAccounts(list);
    } catch (err) {
      console.error('fetchAccounts error:', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = async (data: Partial<PublishAccount>) => {
    const res = await fetch(`${API_BASE}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchAccounts();
  };

  const updateAccount = async (id: string, data: Partial<PublishAccount>) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchAccounts();
  };

  const deleteAccount = async (id: string) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchAccounts();
  };

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, fetchAccounts, createAccount, updateAccount, deleteAccount };
};

export default usePublishAccounts;
