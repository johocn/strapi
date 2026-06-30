// admin/src/hooks/useCollectSources.ts

import { useState, useEffect } from 'react';
import { collectApi } from '../utils/collectApi';

export interface CollectSource {
  id: string;
  name: string;
  url: string;
  type: 'template' | 'custom';
  template?: string;
  titleSelector?: string;
  contentSelector?: string;
  authorSelector?: string;
  dateSelector?: string;
  isActive: boolean;
  lastCollectedAt?: string;
}

export function useCollectSources() {
  const [sources, setSources] = useState<CollectSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getSources();
      setSources(response.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createSource = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.createSource(data);
      await fetchSources();
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSource = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.updateSource(id, data);
      await fetchSources();
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSource = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await collectApi.deleteSource(id);
      await fetchSources();
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    loading,
    error,
    fetchSources,
    createSource,
    updateSource,
    deleteSource,
  };
}