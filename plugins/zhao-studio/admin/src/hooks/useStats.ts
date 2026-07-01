import React from 'react';

type StatsType = 'basic' | 'advanced' | 'pro';

interface UseStatsParams {
  type: StatsType;
}

interface StatsRow {
  key: string;
  name: string;
  value: number;
  change?: number;
  unit?: string;
}

interface ChartData {
  date: string;
  value: number;
}

const API_BASE = '/api/zhao-studio/v1/admin/stats';

const STAT_NAMES: Record<string, string> = {
  totalArticles: '总文章数',
  totalViews: '总浏览量',
  totalPublishes: '总发布数',
  totalRevenue: '总收入',
  totalUsers: '总用户数',
  totalAdClicks: '广告点击数',
  avgReadTime: '平均阅读时长',
  totalPageViews: '页面浏览量',
};

export const useStats = ({ type }: UseStatsParams) => {
  const [stats, setStats] = React.useState<StatsRow[]>([]);
  const [chartData, setChartData] = React.useState<ChartData[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // 根据 type 决定调用哪些接口
        const endpoints =
          type === 'basic'
            ? ['/overview']
            : type === 'advanced'
            ? ['/overview', '/articles']
            : ['/overview', '/articles', '/ad-slots', '/devices'];

        const responses = await Promise.all(
          endpoints.map(e =>
            fetch(`${API_BASE}${e}`).then(r => r.json()).catch(() => ({ data: {} }))
          )
        );

        // 聚合为 stats 表格数据
        const allStats: StatsRow[] = [];

        responses.forEach((json, i) => {
          const data = json.data || {};
          if (i === 0) {
            // overview → 基础指标（对象结构）
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'number' || typeof value === 'string') {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  allStats.push({
                    key,
                    name: STAT_NAMES[key] || key,
                    value: numValue,
                  });
                }
              }
            });
          } else if (Array.isArray(data)) {
            // 其他接口 → 数组结构
            data.forEach(item => {
              allStats.push({
                key: item.id || item.documentId || item.name || Math.random().toString(),
                name: item.name || item.title || item.platformName || '未命名',
                value: Number(item.value || item.count || item.views || 0),
                unit: item.unit,
              });
            });
          }
        });

        setStats(allStats);

        // 组装 chartData（从 overview 提取时间序列）
        const overview = responses[0]?.data || {};
        const chart = overview.timeSeries || overview.daily || overview.timeline || [];
        if (Array.isArray(chart)) {
          setChartData(
            chart.map((d: any) => ({
              date: d.date || d.time || d.dateKey || '',
              value: Number(d.value || d.count || d.views || 0),
            }))
          );
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error('useStats fetchAll error:', err);
        setStats([]);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [type]);

  return { stats, chartData, loading };
};

export default useStats;
