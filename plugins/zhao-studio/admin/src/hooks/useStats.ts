// admin/src/hooks/useStats.ts

import { useState, useCallback } from 'react';
import { analyticsApi } from '../utils/analyticsApi';
import { getDateRange } from '../utils/statsCalculator';

export interface OverviewData {
  pv: number;
  uv: number;
  clickCount: number;
  clickRate: number;
  avgReadDuration: number;
  avgScrollDepth: number;
  pvChange: number;
  uvChange: number;
  clickChange: number;
}

export interface ArticleStats {
  articleId: string;
  title: string;
  pv: number;
  uv: number;
  avgReadDuration: number;
  avgScrollDepth: number;
}

export interface AdSlotStats {
  adSlotId: string;
  name: string;
  code: string;
  position: string;
  clickCount: number;
  clickRate: number;
}

export interface DeviceStats {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface RegionStats {
  country: string;
  city?: string;
  count: number;
}

export interface UserStats {
  total: number;
  registered: number;
  unregistered: number;
  registerRate: number;
}

export type StatsType = 'basic' | 'advanced' | 'pro';

export function useStats(type: StatsType = 'basic') {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [articleStats, setArticleStats] = useState<ArticleStats[]>([]);
  const [adSlotStats, setAdSlotStats] = useState<AdSlotStats[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (dateRange?: { startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const range = dateRange || getDateRange('today');
      const response = await analyticsApi.getOverview(range);
      setOverview(response.data);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArticleStats = useCallback(async (params: { articleId?: string; startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getArticleStats(params);
      setArticleStats(response.data || []);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdSlotStats = useCallback(async (params: { adSlotId?: string; startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getAdSlotStats(params);
      setAdSlotStats(response.data || []);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeviceStats = useCallback(async (params: { startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getDeviceStats(params);
      setDeviceStats(response.data);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRegionStats = useCallback(async (params: { startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getRegionStats(params);
      setRegionStats(response.data || []);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserStats = useCallback(async (params: { startDate: string; endDate: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.getUserStats(params);
      setUserStats(response.data);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async (dateRange?: { startDate: string; endDate: string }) => {
    const range = dateRange || getDateRange('today');
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, adSlotRes] = await Promise.all([analyticsApi.getOverview(range), analyticsApi.getAdSlotStats(range as { adSlotId?: string; startDate: string; endDate: string })]);

      setOverview(overviewRes.data);
      setAdSlotStats(adSlotRes.data || []);

      if (type === 'advanced' || type === 'pro') {
        const [articleRes] = await Promise.all([analyticsApi.getArticleStats(range as { articleId?: string; startDate: string; endDate: string })]);
        setArticleStats(articleRes.data || []);
      }

      if (type === 'pro') {
        const [deviceRes, regionRes, userRes] = await Promise.all([analyticsApi.getDeviceStats(range), analyticsApi.getRegionStats(range), analyticsApi.getUserStats(range)]);
        setDeviceStats(deviceRes.data);
        setRegionStats(regionRes.data || []);
        setUserStats(userRes.data);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  return {
    overview,
    articleStats,
    adSlotStats,
    deviceStats,
    regionStats,
    userStats,
    loading,
    error,
    fetchOverview,
    fetchArticleStats,
    fetchAdSlotStats,
    fetchDeviceStats,
    fetchRegionStats,
    fetchUserStats,
    fetchAll,
  };
}