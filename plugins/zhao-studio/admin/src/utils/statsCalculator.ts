// admin/src/utils/statsCalculator.ts

export interface StatsOverview {
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

export interface StatsItem {
  id: string;
  label: string;
  value: number;
  change?: number;
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

export interface ReferrerStats {
  domain: string;
  count: number;
}

export interface UserStats {
  total: number;
  registered: number;
  unregistered: number;
  registerRate: number;
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}分${secs}秒`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getDateRange(type: 'today' | 'yesterday' | 'week' | 'month'): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (type) {
    case 'today':
      return {
        startDate: today.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0],
      };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      return {
        startDate: weekStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
    case 'month': {
      const monthStart = new Date(today);
      monthStart.setDate(monthStart.getDate() - 30);
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
      };
    }
  }
}

export function aggregateByField(data: any[], field: string): { label: string; value: number }[] {
  const counts: Record<string, number> = {};
  data.forEach((item) => {
    const key = item[field] || '未知';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getTopItems(data: { label: string; value: number }[], limit: number = 10): { label: string; value: number }[] {
  return data.slice(0, limit);
}