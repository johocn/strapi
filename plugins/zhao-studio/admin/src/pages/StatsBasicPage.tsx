import React from 'react';
import { Card, Typography, Space, Row, Col, DatePicker } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsBasicPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'basic' });
  const [dateRange, setDateRange] = React.useState<any>();

  return (
    <PermissionGate action="zhao-studio.stat-summary.view">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>基础统计</Title>
          <Text type="secondary">文章浏览量、发布量等基础指标</Text>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Text>时间范围：</Text>
            <RangePicker onChange={setDateRange} />
          </Space>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="趋势图" size="small">
                <StatsChart data={chartData || []} type="line" loading={loading} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="指标明细" size="small">
                <StatsTable data={stats || []} loading={loading} />
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </PermissionGate>
  );
};

export default StatsBasicPage;
