import { Table, Tag, Card } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const AnomalyTable = () => {
  const api = useApi();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatsAnomalies(10).then(res => {
      setData(res || []);
      setLoading(false);
    });
  }, []);

  const columns = [
    { title: '类型', dataIndex: 'type', width: 120, render: (v: string) => (
      <Tag color={v === 'collect_failed' ? 'error' : 'warning'}>{v === 'collect_failed' ? '采集失败' : '指标计算失败'}</Tag>
    ) },
    { title: '产品', dataIndex: 'productName', ellipsis: true },
    { title: '详情', dataIndex: 'message', ellipsis: true },
    { title: '时间', dataIndex: 'lastCollectTime', width: 160, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  return (
    <Card title="近期异常">
      <Table
        rowKey={(r, i) => String(i)}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default AnomalyTable;
