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
  account?: { documentId?: string; name?: string; platform?: { documentId?: string; name?: string } };
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
      // 接口返回 { data: [...] }，不能直接当数组用（对对象调 .map 会抛错 → 列表恒空）
      const list: PublishRecord[] = json?.data || [];
      // 字段标准化：展平嵌套对象 + 补 id
      const normalized = list.map(r => {
        const normalized = normalizeRecord<PublishRecord>(r);
        return {
          ...normalized,
          // 记录上没有 platform 字段，平台名取 account.platform.name
          platformName: r.platformName || r.account?.platform?.name || r.platform?.name || '-',
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
