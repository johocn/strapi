// admin/src/hooks/usePublishRecords.ts

import { useState, useEffect } from 'react';
import { publishApi } from '../utils/publishApi';

export interface PublishRecord {
  documentId: string;
  article?: any;
  account?: any;
  externalId?: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  retryCount: number;
  publishedAt?: string;
}

export function usePublishRecords(articleId?: string) {
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.listRecords(articleId);
      setRecords(response.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [articleId]);

  return {
    records,
    loading,
    error,
    fetchRecords,
  };
}