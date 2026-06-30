// admin/src/utils/publishApi.ts

import pluginId from '../pluginId';

const baseUrl = `/admin/plugins/${pluginId}`;

export const publishApi = {
  // 平台管理
  async listPlatforms() {
    const response = await fetch(`${baseUrl}/platforms`);
    return response.json();
  },

  async createPlatform(data: any) {
    const response = await fetch(`${baseUrl}/platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async updatePlatform(id: string, data: any) {
    const response = await fetch(`${baseUrl}/platforms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async deletePlatform(id: string) {
    const response = await fetch(`${baseUrl}/platforms/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 账号管理
  async listAccounts(platformId?: string) {
    const url = platformId ? `${baseUrl}/accounts?platformId=${platformId}` : `${baseUrl}/accounts`;
    const response = await fetch(url);
    return response.json();
  },

  async createAccount(data: any) {
    const response = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async updateAccount(id: string, data: any) {
    const response = await fetch(`${baseUrl}/accounts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async deleteAccount(id: string) {
    const response = await fetch(`${baseUrl}/accounts/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 发布操作
  async publishArticle(articleId: string, accountIds: string[]) {
    const response = await fetch(`${baseUrl}/articles/${articleId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountIds }),
    });
    return response.json();
  },

  async listRecords(articleId?: string) {
    const url = articleId ? `${baseUrl}/records?articleId=${articleId}` : `${baseUrl}/records`;
    const response = await fetch(url);
    return response.json();
  },

  async retryPublish(recordId: string) {
    const response = await fetch(`${baseUrl}/records/${recordId}/retry`, {
      method: 'POST',
    });
    return response.json();
  },

  async syncStatus(articleId: string) {
    const response = await fetch(`${baseUrl}/articles/${articleId}/sync`, {
      method: 'POST',
    });
    return response.json();
  },
};