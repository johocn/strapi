const baseUrl = '/api/zhao-studio/v1/admin';

export const syncEventApi = {
  async list(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${baseUrl}/sync-events${query ? '?' + query : ''}`);
    return response.json();
  },

  async findOne(documentId: string) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}`);
    return response.json();
  },

  async resolve(documentId: string, body: any) {
    const response = await fetch(`${baseUrl}/sync-events/${documentId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  },
};