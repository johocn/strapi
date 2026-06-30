import { Card, Col, Row, Statistic } from 'antd';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const StatCards = () => {
  const api = useApi();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getStatsOverview().then(res => setData(res));
  }, []);

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card><Statistic title="产品总数" value={data?.productCount ?? 0} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="采集成功率" value={data ? (data.collectSuccessRate * 100).toFixed(1) + '%' : '-'} valueStyle={{ color: (data?.collectSuccessRate || 0) >= 0.8 ? '#52c41a' : '#faad14' }} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="指标覆盖率" value={data ? (data.riskMetricCoverage * 100).toFixed(1) + '%' : '-'} valueStyle={{ color: (data?.riskMetricCoverage || 0) >= 0.5 ? '#52c41a' : '#faad14' }} /></Card>
      </Col>
      <Col span={6}>
        <Card><Statistic title="今日异常" value={data?.todayAnomaly ?? 0} valueStyle={{ color: (data?.todayAnomaly || 0) > 0 ? '#ff4d4f' : '#52c41a' }} /></Card>
      </Col>
    </Row>
  );
};

export default StatCards;
