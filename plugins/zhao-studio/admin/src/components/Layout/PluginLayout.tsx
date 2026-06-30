import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  CloudDownloadOutlined,
  SendOutlined,
  SettingOutlined,
  BarChartOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '', icon: <HomeOutlined />, label: '仪表盘' },
  { key: 'collect', icon: <CloudDownloadOutlined />, label: '采集管理' },
  { key: 'publish', icon: <SendOutlined />, label: '内容发布' },
  { key: 'stats/basic', icon: <BarChartOutlined />, label: '基础统计' },
  { key: 'stats/advanced', icon: <BarChartOutlined />, label: '高级统计' },
  { key: 'stats/pro', icon: <BarChartOutlined />, label: '专业统计' },
  { key: 'platforms', icon: <SettingOutlined />, label: '平台配置' },
  { key: 'accounts', icon: <SettingOutlined />, label: '账号配置' },
  { key: 'ad-slots', icon: <SettingOutlined />, label: '广告位配置' },
  { key: 'ai-config', icon: <RobotOutlined />, label: 'AI 配置' },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/plugins/zhao-studio/')[1] || '';
  const selectedKey = pathParts.split('?')[0];

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
      <Sider width={200} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => navigate(`/plugins/zhao-studio${key ? '/' + key : ''}`)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {children}
      </Content>
    </Layout>
  );
};

export { PluginLayout };
