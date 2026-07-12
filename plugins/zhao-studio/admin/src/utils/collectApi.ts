// admin/src/utils/collectApi.ts

const baseUrl = '/api/zhao-studio/v1/admin';

export const collectApi = {
  // 采集源管理
  async getSources() {
    const response = await fetch(`${baseUrl}/sources`);
    return response.json();
  },

  async createSource(data: any) {
    const response = await fetch(`${baseUrl}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async updateSource(id: string, data: any) {
    const response = await fetch(`${baseUrl}/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async deleteSource(id: string) {
    const response = await fetch(`${baseUrl}/sources/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // 采集任务管理
  async createTask(sourceId: string) {
    const response = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId }),
    });
    return response.json();
  },

  async getTasks() {
    const response = await fetch(`${baseUrl}/tasks`);
    return response.json();
  },

  async getTask(id: string) {
    const response = await fetch(`${baseUrl}/tasks/${id}`);
    return response.json();
  },

  async fetchSelectedContent(taskId: string, selectedTitles: string[]) {
    const response = await fetch(`${baseUrl}/tasks/${taskId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedTitles }),
    });
    return response.json();
  },

  async confirmImport(taskId: string, confirmedContents: any[]) {
    const response = await fetch(`${baseUrl}/tasks/${taskId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedContents }),
    });
    return response.json();
  },
};