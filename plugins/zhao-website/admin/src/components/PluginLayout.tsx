import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  RocketOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'studio-bridge', icon: <RocketOutlined />, label: '一键发布' },
  { key: 'knowledge-graph', icon: <ShareAltOutlined />, label: '知识图谱' },
  { key: 'first-truth', icon: <SafetyCertificateOutlined />, label: '第一真值' },
  { key: 'ai-summaries', icon: <RobotOutlined />, label: 'AI 摘要' },
  { key: 'brand-voice', icon: <MessageOutlined />, label: '品牌话术' },
  { key: 'seo-output', icon: <SearchOutlined />, label: 'SEO 输出' },
];

const PluginLayout = ({ children }: { children?: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/plugins/zhao-website/')[1] || '';
  const selectedKey = pathParts.split('?')[0];

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px)' }}>
      <Sider width={200} theme="light">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems}
          onClick={({ key }) => navigate(`/plugins/zhao-website${key ? '/' + key : ''}`)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        {children}
      </Content>
    </Layout>
  );
};

export { PluginLayout };