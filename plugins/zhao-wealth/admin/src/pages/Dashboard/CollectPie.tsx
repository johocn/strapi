import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';
import { Card } from 'antd';

const CollectPie = () => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    api.getCollectConfigs({ pageSize: 500 }).then(res => {
      const list = res.records || [];
      const success = list.filter((c: any) => c.collectStatus === 'success').length;
      const failed = list.filter((c: any) => c.collectStatus === 'failed').length;
      const pending = list.filter((c: any) => c.collectStatus === 'pending').length;

      setOption({
        title: { text: '采集状态分布' },
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: success, name: '成功', itemStyle: { color: '#52c41a' } },
            { value: failed, name: '失败', itemStyle: { color: '#ff4d4f' } },
            { value: pending, name: '待采', itemStyle: { color: '#faad14' } },
          ],
        }],
      });
    });
  }, []);

  return (
    <Card>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  );
};

export default CollectPie;
