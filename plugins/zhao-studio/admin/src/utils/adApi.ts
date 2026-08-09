const API_BASE = '/api/zhao-studio/v1/admin';

export const adApi = {
  // Zones
  listZones: async (filters?: any) => {
    const query = filters ? `?${new URLSearchParams(filters)}` : '';
    const res = await fetch(`${API_BASE}/ad-zones${query}`);
    const json = await res.json();
    return json.data || [];
  },
  createZone: async (data: any) => {
    const res = await fetch(`${API_BASE}/ad-zones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '创建失败');
    return json.data;
  },
  updateZone: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/ad-zones/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '更新失败');
    return json.data;
  },
  deleteZone: async (id: string) => {
    const res = await fetch(`${API_BASE}/ad-zones/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
  },
  // Contents
  listContents: async (filters?: any) => {
    const query = filters ? `?${new URLSearchParams(filters)}` : '';
    const res = await fetch(`${API_BASE}/ad-contents${query}`);
    const json = await res.json();
    return json.data || [];
  },
  createContent: async (data: any) => {
    const res = await fetch(`${API_BASE}/ad-contents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '创建失败');
    return json.data;
  },
  updateContent: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/ad-contents/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '更新失败');
    return json.data;
  },
  deleteContent: async (id: string) => {
    const res = await fetch(`${API_BASE}/ad-contents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
  },
};
