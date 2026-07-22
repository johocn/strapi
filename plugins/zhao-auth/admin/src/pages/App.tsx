// admin/src/pages/App.tsx
import React from 'react';
import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title } = Typography;

const App = () => {
  return (
    <Layout>
      <Content style={{ padding: '24px' }}>
        <Title level={2}>认证授权管理</Title>
        <p>用户管理 / 角色权限 / 操作日志（建设中）</p>
      </Content>
    </Layout>
  );
};

export default App;
