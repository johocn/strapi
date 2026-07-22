// admin/src/pages/App.tsx
import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { UserOutlined, SafetyOutlined, AuditOutlined } from '@ant-design/icons';
import { PermissionsProvider, useMyPermissions } from '../context/PermissionsProvider';
import { PermissionGate } from '../components/PermissionGate';
import UserManagementPage from './UserManagementPage';
import PermissionMatrixPage from './PermissionMatrixPage';
import AuditLogPage from './AuditLogPage';

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'users', icon: <UserOutlined />, label: '用户管理', permission: 'zhao-auth.user.manage' },
  { key: 'matrix', icon: <SafetyOutlined />, label: '权限矩阵', permission: 'zhao-auth.permission.matrix.edit' },
  { key: 'logs', icon: <AuditOutlined />, label: '操作日志', permission: 'zhao-auth.audit-log.view' },
];

const PluginLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useMyPermissions();

  const currentPath = location.pathname.split('/plugins/zhao-auth/')[1] || 'users';
  const visibleItems = menuItems.filter(item => !item.permission || hasPermission(item.permission));

  return (
    <Layout>
      <Sider width={200} style={{ background: '#fff' }}>
        <Menu
          mode="inline"
          selectedKeys={[currentPath]}
          items={visibleItems.map(item => ({ key: item.key, icon: item.icon, label: item.label }))}
          onClick={({ key }) => navigate(`/plugins/zhao-auth/${key}`)}
        />
      </Sider>
      <Content style={{ padding: 24, background: '#f0f2f5' }}>
        {children}
      </Content>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <PermissionsProvider>
      <PluginLayout>
        <Routes>
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/matrix" element={<PermissionMatrixPage />} />
          <Route path="/logs" element={<AuditLogPage />} />
          <Route path="*" element={<UserManagementPage />} />
        </Routes>
      </PluginLayout>
    </PermissionsProvider>
  );
};

export default App;
