import { Row, Col, Space } from 'antd';
import StatCards from './StatCards';
import AttentionChart from './AttentionChart';
import CollectPie from './CollectPie';
import AnomalyTable from './AnomalyTable';

const Dashboard = () => (
  <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <StatCards />
    <Row gutter={16}>
      <Col span={14}><AttentionChart /></Col>
      <Col span={10}><CollectPie /></Col>
    </Row>
    <AnomalyTable />
  </Space>
);

export default Dashboard;
