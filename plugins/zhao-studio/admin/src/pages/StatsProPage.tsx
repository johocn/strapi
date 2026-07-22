import React from 'react';
import { Card, Typography, Space, Row, Col, DatePicker, Select } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';
import { PermissionGate } from '../components/PermissionGate';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsProPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'pro' });
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');

  return (
    <PermissionGate action="zhao-studio.stat-summary.view">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>专业统计</Title>
          <Text type="secondary">完整业务数据分析</Text>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Text>时间范围：</Text>
            <RangePicker />
            <Text>图表类型：</Text>
            <Select
              value={chartType}
              onChange={setChartType}
              style={{ width: 120 }}
              options={[
                { value: 'line', label: '折线图' },
                { value: 'bar', label: '柱状图' },
              ]}
            />
          </Space>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title="主图表" size="small">
                <StatsChart data={chartData || []} type={chartType} loading={loading} height={400} />
              </Card>
            </Col>
            <Col xs={24}>
              <Card title="完整明细" size="small">
                <StatsTable data={stats || []} loading={loading} />
              </Card>
            </Col>
          </Row>
        </Card>
      </Space>
    </PermissionGate>
  );
};

export default StatsProPage;
