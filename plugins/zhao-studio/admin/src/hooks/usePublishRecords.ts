import React from 'react';
import { normalizeRecord } from '../utils/fieldNormalizer';

interface UsePublishRecordsParams {
  platformId?: string;
  accountId?: string;
}

interface PublishRecord {
  id: string;
  documentId?: string;
  title?: string;
  platformName?: string;
  platform?: { documentId?: string; name?: string };
  account?: { documentId?: string; name?: string };
  status: string;
  publishedAt?: string;
  errorMessage?: string;
  error?: string;
}

export const usePublishRecords = (params?: UsePublishRecordsParams) => {
  const [records, setRecords] = React.useState<PublishRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (params?.platformId) query.set('platformId', params.platformId);
      if (params?.accountId) query.set('accountId', params.accountId);
      const url = `/api/zhao-studio/v1/admin/records${query.toString() ? '?' + query : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      let list: PublishRecord[] = json.data || [];
      // 前端过滤兜底（后端不支持过滤参数时）
      if (params?.platformId) {
        list = list.filter(r =>
          r.platform?.documentId === params.platformId ||
          (r as any).platformId === params.platformId
        );
      }
      if (params?.accountId) {
        list = list.filter(r =>
          r.account?.documentId === params.accountId ||
          (r as any).accountId === params.accountId
        );
      }
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord<PublishRecord>(r);
        return {
          ...normalized,
          platformName: r.platformName || r.platform?.name || '-',
          errorMessage: r.errorMessage || r.error || '',
        };
      });
      setRecords(normalized);
    } catch (err) {
      console.error('fetchRecords error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [params?.platformId, params?.accountId]);

  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { records, loading, refetch: fetchRecords };
};

export default usePublishRecords;
