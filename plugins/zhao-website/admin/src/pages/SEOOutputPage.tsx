import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Button, Space, Spin, Typography, message } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { API } from '../utils/api';

const { Text } = Typography;

// SEO 接口返回 XML/text 而非 JSON，使用独立的 text fetch hook
function useFetchText(url: string | null) {
  const [data, setData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const text = await res.text();
        if (!cancelled) {
          setData(text);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, trigger]);

  return { data, loading, error, refetch };
}

const SEOOutputPage = () => {
  const [activeTab, setActiveTab] = useState('sitemap');

  const sitemapFetch = useFetchText(activeTab === 'sitemap' ? API.seoSitemap : null);
  const robotsFetch = useFetchText(activeTab === 'robots' ? API.seoRobots : null);
  const llmsFetch = useFetchText(activeTab === 'llms' ? API.seoLlmsTxt : null);

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
            {fetchState.data || '加载中...'}
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
