import React from 'react';
import { Row, Col, Typography, Card, Tabs, Table, Spin } from 'antd';
import OverviewCard from '../components/OverviewCard';
import { useFetch } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Title, Paragraph } = Typography;

const DashboardPage = () => {
  const { data: overview, loading } = useFetch<any>(API.statsOverview);
  const { data: leadStats } = useFetch<any>(API.statsLead(30));
  const { data: searchStats } = useFetch<any>(API.statsSearch(30));

  return (
    <Spin spinning={loading}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={3}>官网管理仪表盘</Title>
        <Paragraph type="secondary">内容资产、线索转化、SEO 表现概览</Paragraph>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="文章数" value={overview?.articles ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="产品数" value={overview?.products ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="案例数" value={overview?.cases ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="线索数" value={overview?.leads ?? 0} />
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'leads',
              label: '线索趋势（近 30 天）',
              children: (
                <Table
                  size="small"
                  dataSource={Array.isArray(leadStats) ? leadStats : (leadStats?.data || [])}
                  columns={[
                    { title: '日期', dataIndex: 'date' },
                    { title: '线索数', dataIndex: 'count' },
                  ]}
                  rowKey="date"
                  pagination={false}
                />
              ),
            },
            {
              key: 'search',
              label: '搜索热词（近 30 天 Top 10）',
              children: (
                <Table
                  size="small"
                  dataSource={(Array.isArray(searchStats?.topKeywords) ? searchStats.topKeywords : []).slice(0, 10)}
                  columns={[
                    { title: '关键词', dataIndex: 'keyword' },
                    { title: '搜索次数', dataIndex: 'count' },
                  ]}
                  rowKey="keyword"
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>
    </Spin>
  );
};

export default DashboardPage;
