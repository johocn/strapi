import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  CloudSyncOutlined,
  BarChartOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'collect', icon: <CloudSyncOutlined />, label: '采集监控' },
  { key: 'metrics', icon: <BarChartOutlined />, label: '指标中心' },
  { key: 'product', icon: <FundOutlined />, label: '产品管理' },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 当前选中 key：从 path 提取
  const pathParts = location.pathname.split('/plugins/zhao-wealth/')[1] || '';
  const selectedKey = pathParts.split('/')[0] || '';

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
      <Sider width={200} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => navigate(`/plugins/zhao-wealth${key ? '/' + key : ''}`)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {children}
      </Content>
    </Layout>
  );
};

export { PluginLayout };
