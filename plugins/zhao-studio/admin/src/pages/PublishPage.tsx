import React from 'react';
import { Card, Typography, Space, Table, Button } from 'antd';
import PublishPanel from '../components/PublishPanel';

const { Title, Text } = Typography;

const PublishPage = () => {
  const [selectedArticleIds, setSelectedArticleIds] = React.useState<string[]>([]);
  const [articles, setArticles] = React.useState<any[]>([]);

  React.useEffect(() => {
    setArticles([]);
  }, []);

  const columns = [
    {
      title: '选择',
      key: 'select',
      render: (_, record) => ({
        children: (
          <input
            type="checkbox"
            checked={selectedArticleIds.includes(record.id)}
            onChange={(e) => {
              setSelectedArticleIds((prev) =>
                e.target.checked
                  ? [...prev, record.id]
                  : prev.filter((id) => id !== record.id)
              );
            }}
          />
        ),
      }),
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>内容发布</Title>
        <Text type="secondary">多渠道内容分发</Text>
      </div>

      <Card title="待发布文章">
        <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无待发布文章' }}
        />
      </Card>

      {selectedArticleIds.length > 0 && (
        <Card title="发布操作">
          <PublishPanel articleIds={selectedArticleIds} />
        </Card>
      )}
    </Space>
  );
};

export default PublishPage;
