import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface PublishAccount {
  id: string;
  documentId?: string;
  name: string;
  platformId?: string;
  platform?: { documentId?: string; name?: string };
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
      const res = await fetch(`${API_BASE}/accounts`);
      const json = await res.json();
      let list = normalizeList<PublishAccount>(json.data || []);
      // 前端过滤（按 platformId）
      if (platformId) {
        list = list.filter(a =>
          a.platformId === platformId ||
          a.platform?.documentId === platformId
        );
      }
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
