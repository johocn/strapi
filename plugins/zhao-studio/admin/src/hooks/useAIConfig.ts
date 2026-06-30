// admin/src/hooks/useAIConfig.ts

import { useState, useEffect } from 'react';
import { aiApi } from '../utils/aiApi';

export interface AIConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    provider: 'qwen',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.getConfig();
      setConfig(response.data || { enabled: false, provider: 'qwen' });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (data: AIConfig) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.updateConfig(data);
      setConfig(data);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (provider: string, apiKey: string, endpoint?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.testConnection(provider, apiKey, endpoint);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    updateConfig,
    testConnection,
  };
}