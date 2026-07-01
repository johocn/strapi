import React from 'react';
import { normalizeList } from '../utils/fieldNormalizer';

// 枚举值映射（组件 ← → 后端）
const POSITION_TO_BACKEND = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
  inarticle: 'article-content',
};

const POSITION_TO_FRONTEND: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  sidebar: 'sidebar',
  'article-content': 'inarticle',
  'list-page': 'sidebar',
  'home-page': 'header',
};

const TYPE_TO_BACKEND = {
  image: 'banner',
  text: 'native',
  video: 'popup',
};

const TYPE_TO_FRONTEND: Record<string, string> = {
  banner: 'image',
  native: 'text',
  popup: 'video',
  'product-link': 'image',
};

interface AdSlot {
  id: string;
  documentId?: string;
  name: string;
  position: string;
  type?: string;
  width?: number;
  height?: number;
  adCode?: string;
  code?: string;
  isActive?: boolean;
}

const API_BASE = '/api/zhao-studio/v1/admin/ad-slots';

// 后端数据 → 组件数据
const normalizeSlot = (slot: any): AdSlot => {
  const normalized = normalizeRecord(slot);
  return {
    ...normalized,
    adCode: slot.code || slot.adCode || '',
    position: POSITION_TO_FRONTEND[slot.position] || slot.position,
    type: TYPE_TO_FRONTEND[slot.type] || slot.type || 'image',
  };
};

// 组件数据 → 后端数据
const mapToBackend = (data: any) => {
  const { adCode, position, type, ...rest } = data;
  return {
    ...rest,
    code: adCode,
    position: (POSITION_TO_BACKEND as any)[position] || position,
    type: (TYPE_TO_BACKEND as any)[type] || type,
  };
};

export const useAdSlots = () => {
  const [slots, setSlots] = React.useState<AdSlot[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchSlots = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      const list = (json.data || []).map(normalizeSlot);
      setSlots(list);
    } catch (err) {
      console.error('fetchSlots error:', err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSlot = async (data: Partial<AdSlot>) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapToBackend(data)),
    });
    if (!res.ok) throw new Error('创建失败');
    await fetchSlots();
  };

  const updateSlot = async (id: string, data: Partial<AdSlot>) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapToBackend(data)),
    });
    if (!res.ok) throw new Error('更新失败');
    await fetchSlots();
  };

  const deleteSlot = async (id: string) => {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    await fetchSlots();
  };

  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, loading, createSlot, updateSlot, deleteSlot };
};

export default useAdSlots;
