import React from 'react';
import { Table, Tag, Space, Typography } from 'antd';
import { usePublishRecords } from '../hooks/usePublishRecords';

const { Text } = Typography;

interface PublishRecordListProps {
  platformId?: string;
  accountId?: string;
}

const PublishRecordList: React.FC<PublishRecordListProps> = ({ platformId, accountId }) => {
  const { records, loading } = usePublishRecords({ platformId, accountId });

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          publishing: 'processing',
          success: 'success',
          failed: 'error',
        };
        const labelMap: Record<string, string> = {
          pending: '待发布',
          publishing: '发布中',
          success: '成功',
          failed: '失败',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt' },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (msg: string) => msg ? <Text type="danger">{msg}</Text> : '-',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={records}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default PublishRecordList;
