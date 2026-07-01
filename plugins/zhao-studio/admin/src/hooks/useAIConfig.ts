import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin/ai';

interface AIConfig {
  enabled?: boolean;
  provider?: string;
  apiKey?: string;
  endpoint?: string;
  apiBase?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  isActive?: boolean;
}

export const useAIConfig = () => {
  const [config, setConfig] = React.useState<AIConfig | null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/config`);
      const json = await res.json();
      setConfig(json.data || null);
    } catch (err) {
      console.error('fetchConfig error:', err);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = async (data: Partial<AIConfig>) => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('保存失败');
    await fetchConfig();
  };

  const testConfig = async (data: Partial<AIConfig>) => {
    const res = await fetch(`${API_BASE}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: data.provider,
        apiKey: data.apiKey,
        endpoint: data.endpoint || data.apiBase,
      }),
    });
    if (!res.ok) throw new Error('测试失败');
    return res.json();
  };

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, updateConfig, testConfig };
};

export default useAIConfig;
