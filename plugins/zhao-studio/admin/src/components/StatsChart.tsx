import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface ChartData {
  date: string;
  value: number;
}

interface StatsChartProps {
  data: ChartData[];
  type?: 'line' | 'bar';
  height?: number;
  loading?: boolean;
  title?: string;
}

const StatsChart: React.FC<StatsChartProps> = ({
  data,
  type = 'line',
  height = 300,
  loading = false,
  title,
}) => {
  const option = {
    title: title ? { text: title } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
    },
    yAxis: { type: 'value' },
    series: [
      {
        data: data.map((d) => d.value),
        type,
        smooth: type === 'line',
        itemStyle: { color: '#1677ff' },
      },
    ],
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  };

  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  return <ReactECharts option={option} style={{ height }} />;
};

export default StatsChart;
