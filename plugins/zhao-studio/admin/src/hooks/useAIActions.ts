// admin/src/hooks/useAIActions.ts

import { useState } from 'react';
import { aiApi } from '../utils/aiApi';

export function useAIActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async (articleId: string, length?: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.generateSummary(articleId, length);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const optimizeTitle = async (articleId: string, style: 'formal' | 'casual' | 'shocking') => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.optimizeTitle(articleId, style);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const rewriteContent = async (articleId: string, tone: 'formal' | 'casual' | 'humorous') => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.rewriteContent(articleId, tone);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const convertLanguage = async (articleId: string, target: 'simplified' | 'traditional') => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.convertLanguage(articleId, target);
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    generateSummary,
    optimizeTitle,
    rewriteContent,
    convertLanguage,
  };
}