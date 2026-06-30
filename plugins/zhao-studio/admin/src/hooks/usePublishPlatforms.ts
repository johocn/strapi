// admin/src/hooks/usePublishPlatforms.ts

import { useState, useEffect } from 'react';
import { publishApi } from '../utils/publishApi';

export interface PublishPlatform {
  documentId: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
}

export function usePublishPlatforms() {
  const [platforms, setPlatforms] = useState<PublishPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatforms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.listPlatforms();
      setPlatforms(response.data || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createPlatform = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.createPlatform(data);
      setPlatforms([...platforms, response.data]);
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePlatform = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await publishApi.updatePlatform(id, data);
      setPlatforms(platforms.map((p) => (p.documentId === id ? response.data : p)));
      return response.data;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePlatform = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await publishApi.deletePlatform(id);
      setPlatforms(platforms.filter((p) => p.documentId !== id));
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  return {
    platforms,
    loading,
    error,
    fetchPlatforms,
    createPlatform,
    updatePlatform,
    deletePlatform,
  };
}