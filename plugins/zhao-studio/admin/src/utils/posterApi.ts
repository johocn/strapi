const API_BASE = '/api/zhao-studio/v1/admin';

export const posterApi = {
  listTemplates: async (filters?: any) => {
    const query = filters ? `?${new URLSearchParams(filters)}` : '';
    const res = await fetch(`${API_BASE}/poster-templates${query}`);
    const json = await res.json();
    return json.data || [];
  },
  createTemplate: async (data: any) => {
    const res = await fetch(`${API_BASE}/poster-templates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '创建失败');
    return json.data;
  },
  findOneTemplate: async (id: string) => {
    const res = await fetch(`${API_BASE}/poster-templates/${id}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '查询失败');
    return json.data;
  },
  updateTemplate: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/poster-templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '更新失败');
    return json.data;
  },
  deleteTemplate: async (id: string) => {
    const res = await fetch(`${API_BASE}/poster-templates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
  },
  cloneTemplate: async (id: string) => {
    const res = await fetch(`${API_BASE}/poster-templates/${id}/clone`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '克隆失败');
    return json.data;
  },
  batchSaveElements: async (templateId: string, elements: any[]) => {
    const res = await fetch(`${API_BASE}/poster-templates/${templateId}/elements`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || '保存元素失败');
    return json.data;
  },
};
