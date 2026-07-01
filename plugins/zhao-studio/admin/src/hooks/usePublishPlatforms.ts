import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

interface PublishPlatform {
  id: string;
  documentId?: string;
  name: string;
  type?: string;
  appId?: string;
  appSecret?: string;
  callbackUrl?: string;
  description?: string;
  isActive?: boolean;
}

const API_BASE = '/api/zhao-studio/v1/admin';

export const usePublishPlatforms = () => {
  const [platforms, setPlatforms] = React.useState<PublishPlatform[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchPlatforms = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/platforms`);
      const json = await res.json();
      setPlatforms(normalizeList<PublishPlatform>(json.data || []));
    } catch (err) {
      console.error('fetchPlatforms error:', err);
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlatform = async (data: Partial<PublishPlatform>) => {
    const res = await fetch(`${API_BASE}/platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchPlatforms();
  };

  const updatePlatform = async (id: string, data: Partial<PublishPlatform>) => {
    const res = await fetch(`${API_BASE}/platforms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchPlatforms();
  };

  const deletePlatform = async (id: string) => {
    const res = await fetch(`${API_BASE}/platforms/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchPlatforms();
  };

  React.useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return { platforms, loading, createPlatform, updatePlatform, deletePlatform };
};

export default usePublishPlatforms;
