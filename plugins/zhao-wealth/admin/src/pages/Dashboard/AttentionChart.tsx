import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Card } from 'antd';

const AttentionChart = () => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    api.getCustomerProducts({ pageSize: 500 }).then(res => {
      const list = res.records || [];
      // 按产品聚合
      const counter: Record<string, number> = {};
      list.forEach((cp: any) => {
        const name = cp.product?.productName || '未知';
        counter[name] = (counter[name] || 0) + 1;
      });
      const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 10);

      setOption({
        title: { text: '客户关注热度 Top10' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: sorted.map(s => s[0]).reverse() },
        series: [{ type: 'bar', data: sorted.map(s => s[1]).reverse(), itemStyle: { color: '#5470c6' } }],
        grid: { left: 140, right: 40, top: 40, bottom: 30 },
      });
    });
  }, []);

  return (
    <Card>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  );
};

export default AttentionChart;
