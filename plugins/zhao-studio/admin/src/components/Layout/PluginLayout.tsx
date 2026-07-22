import { Layout, Menu } from 'antd';
import {
  HomeOutlined,
  CloudDownloadOutlined,
  SendOutlined,
  SettingOutlined,
  BarChartOutlined,
  RobotOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMyPermissions } from '../../context/PermissionsProvider';

const { Sider, Content } = Layout;

interface MenuConfigItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  permission: string | null;
}

const menuConfig: MenuConfigItem[] = [
  { key: '', icon: <HomeOutlined />, label: '仪表盘', permission: null },
  { key: 'collect', icon: <CloudDownloadOutlined />, label: '采集管理', permission: 'zhao-studio.collect-source.manage' },
  { key: 'publish', icon: <SendOutlined />, label: '内容发布', permission: 'zhao-studio.publish-record.manage' },
  { key: 'stats/basic', icon: <BarChartOutlined />, label: '基础统计', permission: 'zhao-studio.stat-summary.view' },
  { key: 'stats/advanced', icon: <BarChartOutlined />, label: '高级统计', permission: 'zhao-studio.stat-summary.view' },
  { key: 'stats/pro', icon: <BarChartOutlined />, label: '专业统计', permission: 'zhao-studio.stat-summary.view' },
  { key: 'platforms', icon: <SettingOutlined />, label: '平台配置', permission: 'zhao-studio.publish-platform.manage' },
  { key: 'accounts', icon: <SettingOutlined />, label: '账号配置', permission: 'zhao-studio.publish-account.manage' },
  { key: 'ad-slots', icon: <SettingOutlined />, label: '广告位配置', permission: 'zhao-studio.ad-slot.manage' },
  { key: 'sync-events', icon: <SyncOutlined />, label: '同步事件', permission: 'zhao-studio.sync-event.manage' },
  { key: 'ai-config', icon: <RobotOutlined />, label: 'AI 配置', permission: 'zhao-studio.article-draft.manage' },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useMyPermissions();
  const pathParts = location.pathname.split('/plugins/zhao-studio/')[1] || '';
  const selectedKey = pathParts.split('?')[0];

  const visibleItems = menuConfig
    .filter(item => !item.permission || hasPermission(item.permission))
    .map(({ permission, ...rest }) => rest);

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
      <Sider width={200} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={visibleItems}
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
