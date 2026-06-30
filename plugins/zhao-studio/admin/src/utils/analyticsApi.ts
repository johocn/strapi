// admin/src/utils/analyticsApi.ts

import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}/analytics`;

export const analyticsApi = {
  // 广告位管理
  async listAdSlots() {
    const response = await fetch(`${baseUrl}/ad-slots`);
    return response.json();
  },

  async createAdSlot(data: any) {
    const response = await fetch(`${baseUrl}/ad-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async updateAdSlot(id: string, data: any) {
    const response = await fetch(`${baseUrl}/ad-slots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async deleteAdSlot(id: string) {
    const response = await fetch(`${baseUrl}/ad-slots/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async toggleAdSlot(id: string, isActive: boolean) {
    const response = await fetch(`${baseUrl}/ad-slots/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    return response.json();
  },

  // 统计查询
  async getOverview(params: { startDate: string; endDate: string }) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/stats/overview?${query}`);
    return response.json();
  },

  async getArticleStats(params: { articleId?: string; startDate: string; endDate: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await fetch(`${baseUrl}/stats/articles?${query}`);
    return response.json();
  },

  async getAdSlotStats(params: { adSlotId?: string; startDate: string; endDate: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await fetch(`${baseUrl}/stats/ad-slots?${query}`);
    return response.json();
  },

  async getDeviceStats(params: { startDate: string; endDate: string }) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/stats/devices?${query}`);
    return response.json();
  },

  async getRegionStats(params: { startDate: string; endDate: string }) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/stats/regions?${query}`);
    return response.json();
  },

  async getUserStats(params: { startDate: string; endDate: string }) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/stats/users?${query}`);
    return response.json();
  },
};