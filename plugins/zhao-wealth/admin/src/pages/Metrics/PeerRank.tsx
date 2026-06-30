import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import { METRIC_NAMES } from '../../constants/enums';

const PeerRank = ({ period, currentProductId }: { period: string; currentProductId: number }) => {
  const api = useApi();
  const [metricName, setMetricName] = useState('volatility');
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!period || !metricName) return;
    api.getMetricPeers(period, metricName, 30).then(res => {
      const list = (res || []).slice().reverse();
      const names = list.map((r: any) => r.productName);
      const values = list.map((r: any) => r.metricValue);
      const colors = list.map((r: any) => r.productId === currentProductId ? '#ff4d4f' : '#5470c6');

      setOption({
        title: { text: `同类排名 - ${METRIC_NAMES[metricName]}` },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: names },
        series: [{
          type: 'bar',
          data: values.map((v: number, i: number) => ({ value: v, itemStyle: { color: colors[i] } })),
        }],
        grid: { left: 120, right: 40, top: 40, bottom: 40 },
      });
    });
  }, [period, metricName, currentProductId]);

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <span>指标：</span>
        <Select
          value={metricName}
          onChange={setMetricName}
          options={Object.entries(METRIC_NAMES).map(([v, l]) => ({ value: v, label: l }))}
          style={{ width: 160 }}
        />
      </Space>
      <ReactECharts option={option} style={{ height: 360 }} />
    </div>
  );
};

export default PeerRank;
