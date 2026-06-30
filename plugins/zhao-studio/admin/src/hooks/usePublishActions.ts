// admin/src/hooks/usePublishActions.ts

import { useState } from 'react';
import { publishApi } from '../utils/publishApi';

export function usePublishActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishArticle = async (articleId: string, accountIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.publishArticle(articleId, accountIds);
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const retryPublish = async (recordId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.retryPublish(recordId);
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncStatus = async (articleId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.syncStatus(articleId);
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    publishArticle,
    retryPublish,
    syncStatus,
  };
}