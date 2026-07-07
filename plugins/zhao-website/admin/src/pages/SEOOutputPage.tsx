import React, { useState } from 'react';
import { Card, Tabs, Button, Space, Spin, Typography, message } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useFetch } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Text } = Typography;

const SEOOutputPage = () => {
  const [activeTab, setActiveTab] = useState('sitemap');

  const sitemapFetch = useFetch<string>(activeTab === 'sitemap' ? API.seoSitemap : null);
  const robotsFetch = useFetch<string>(activeTab === 'robots' ? API.seoRobots : null);
  const llmsFetch = useFetch<string>(activeTab === 'llms' ? API.seoLlmsTxt : null);

  const handleCopy = async (text: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const renderTab = (label: string, fetchState: any) => (
    <Card
      title={label}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchState.refetch}>刷新</Button>
          <Button icon={<CopyOutlined />} onClick={() => handleCopy(fetchState.data)}>复制</Button>
        </Space>
      }
    >
      <Spin spinning={fetchState.loading}>
        {fetchState.error ? (
          <Text type="danger">加载失败: {fetchState.error.message}</Text>
        ) : (
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 600, overflow: 'auto' }}>
            {typeof fetchState.data === 'string' ? fetchState.data : JSON.stringify(fetchState.data, null, 2)}
          </pre>
        )}
      </Spin>
    </Card>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        { key: 'sitemap', label: 'sitemap.xml', children: renderTab('sitemap.xml', sitemapFetch) },
        { key: 'robots', label: 'robots.txt', children: renderTab('robots.txt', robotsFetch) },
        { key: 'llms', label: 'llms.txt', children: renderTab('llms.txt', llmsFetch) },
      ]}
    />
  );
};

export default SEOOutputPage;
