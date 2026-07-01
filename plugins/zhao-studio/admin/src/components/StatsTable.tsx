import React from 'react';
import { Table, Tag } from 'antd';

interface StatsTableRow {
  key: string;
  name: string;
  value: number;
  change?: number;
  unit?: string;
}

interface StatsTableProps {
  data: StatsTableRow[];
  loading?: boolean;
  title?: string;
}

const StatsTable: React.FC<StatsTableProps> = ({ data, loading = false }) => {
  const columns = [
    { title: '指标', dataIndex: 'name', key: 'name' },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: StatsTableRow) =>
        `${value.toLocaleString()}${record.unit ? ' ' + record.unit : ''}`,
    },
    {
      title: '变化',
      dataIndex: 'change',
      key: 'change',
      render: (change?: number) => {
        if (change === undefined || change === 0) return <Tag>持平</Tag>;
        return change > 0
          ? <Tag color="success">↑ {change}%</Tag>
          : <Tag color="error">↓ {Math.abs(change)}%</Tag>;
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      rowKey="key"
    />
  );
};

export default StatsTable;
