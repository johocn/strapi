// admin/src/utils/aiApi.ts

const baseUrl = '/api/zhao-studio/v1/admin/ai';

export const aiApi = {
  async getConfig() {
    const response = await fetch(`${baseUrl}/config`);
    return response.json();
  },

  async updateConfig(data: any) {
    const response = await fetch(`${baseUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return response.json();
  },

  async testConnection(provider: string, apiKey: string, endpoint?: string) {
    const response = await fetch(`${baseUrl}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, endpoint }),
    });
    return response.json();
  },

  async generateSummary(articleId: string, length?: number) {
    const response = await fetch(`${baseUrl}/articles/${articleId}/summary?length=${length || 150}`, {
      method: 'POST',
    });
    return response.json();
  },

  async optimizeTitle(articleId: string, style: 'formal' | 'casual' | 'shocking') {
    const response = await fetch(`${baseUrl}/articles/${articleId}/title?style=${style}`, {
      method: 'POST',
    });
    return response.json();
  },

  async rewriteContent(articleId: string, tone: 'formal' | 'casual' | 'humorous') {
    const response = await fetch(`${baseUrl}/articles/${articleId}/rewrite?tone=${tone}`, {
      method: 'POST',
    });
    return response.json();
  },

  async convertLanguage(articleId: string, target: 'simplified' | 'traditional') {
    const response = await fetch(`${baseUrl}/articles/${articleId}/convert?target=${target}`, {
      method: 'POST',
    });
    return response.json();
  },
};