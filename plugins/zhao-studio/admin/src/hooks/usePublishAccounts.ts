// admin/src/hooks/usePublishAccounts.ts

import { useState, useEffect } from 'react';
import { publishApi } from '../utils/publishApi';

export interface PublishAccount {
  documentId: string;
  name: string;
  platform?: any;
  config?: any;
  isActive: boolean;
  lastPublishedAt?: string;
}

export function usePublishAccounts(platformId?: string) {
  const [accounts, setAccounts] = useState<PublishAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.listAccounts(platformId);
      setAccounts(response.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.createAccount(data);
      setAccounts([...accounts, response.data]);
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.updateAccount(id, data);
      setAccounts(accounts.map((a) => (a.documentId === id ? response.data : a)));
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await publishApi.deleteAccount(id);
      setAccounts(accounts.filter((a) => a.documentId !== id));
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [platformId]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}