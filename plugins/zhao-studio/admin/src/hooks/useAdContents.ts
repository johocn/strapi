import React from 'react';
import { normalizeRecord } from '../utils/fieldNormalizer';
import { adApi } from '../utils/adApi';

export interface AdContent {
  id: string;
  documentId?: string;
  name: string;
  adZone?: string | { documentId?: string; name?: string };
  contentType: string;
  isActive: boolean;
  sortOrder?: number;
  priority?: number;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  [key: string]: any;
}

interface UseAdContentsParams {
  adZoneId?: string;
}

export const useAdContents = (params?: UseAdContentsParams) => {
  const [contents, setContents] = React.useState<AdContent[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchContents = React.useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (params?.adZoneId) filters.adZoneId = params.adZoneId;
      const list = await adApi.listContents(filters);
      const normalized = (list || []).map((c: any) => normalizeRecord<AdContent>(c));
      setContents(normalized);
    } catch (err) {
      console.error('fetchContents error:', err);
      setContents([]);
    } finally {
      setLoading(false);
    }
  }, [params?.adZoneId]);

  const createContent = async (data: Partial<AdContent>) => {
    await adApi.createContent(data);
    await fetchContents();
  };

  const updateContent = async (id: string, data: Partial<AdContent>) => {
    await adApi.updateContent(id, data);
    await fetchContents();
  };

  const deleteContent = async (id: string) => {
    await adApi.deleteContent(id);
    await fetchContents();
  };

  React.useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return { contents, loading, createContent, updateContent, deleteContent, fetchContents };
};

export default useAdContents;
