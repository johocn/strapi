import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { METRIC_NAMES } from '../../constants/enums';

const TrendChart = ({ productId }: { productId: number }) => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!productId) return;
    api.getMetricTrend(productId).then(res => {
      const trend = res || {};
      const periods = ['m1', 'm3', 'm6', 'y1'];
      const metricNames = ['volatility', 'maxDrawdown', 'sharpe', 'rankPercentile'];

      const series = [];
      for (const period of periods) {
        const data = (trend[period] || []).map((item: any) => item);
        for (const metricName of metricNames) {
          series.push({
            name: `${METRIC_NAMES[metricName]}-${period}`,
            type: 'line',
            data: data.map((d: any) => d[metricName]),
            smooth: true,
          });
        }
      }

      const dates = (trend.y1 || []).map((d: any) => d.snapshotDate);

      setOption({
        title: { text: '4 指标历史趋势（按周期）' },
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), top: 30, type: 'scroll' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series,
        grid: { left: 60, right: 40, top: 100, bottom: 40 },
      });
    });
  }, [productId]);

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

export default TrendChart;
