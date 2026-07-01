import React from 'react';
import { Row, Col, Typography, Card, Space } from 'antd';
import OverviewCard from '../components/OverviewCard';

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={2}>内容工作室</Title>
        <Paragraph type="secondary">
          定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计
        </Paragraph>
      </Card>

      <div>
        <Title level={4}>今日概览</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="采集文章" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="发布文章" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="总浏览" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="广告收入" value={0} change={0} unit="元" />
          </Col>
        </Row>
      </div>
    </Space>
  );
};

export default HomePage;
