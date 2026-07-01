import React from 'react';
import { Card, Typography, Space, Tabs, Row, Col, DatePicker } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsAdvancedPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'advanced' });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>高级统计</Title>
        <Text type="secondary">多维度数据分析</Text>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Text>时间范围：</Text>
          <RangePicker />
        </Space>
        <Tabs
          items={[
            {
              key: 'overview',
              label: '总览',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="趋势" size="small">
                      <StatsChart data={chartData || []} type="line" loading={loading} height={350} />
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="明细" size="small">
                      <StatsTable data={stats || []} loading={loading} />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'comparison',
              label: '对比分析',
              children: (
                <Card title="对比图表" size="small">
                  <StatsChart data={chartData || []} type="bar" loading={loading} height={350} />
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default StatsAdvancedPage;
