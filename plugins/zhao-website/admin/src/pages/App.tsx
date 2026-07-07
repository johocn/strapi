import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from '../components/PluginLayout';
import DashboardPage from './DashboardPage';
import StudioBridgePage from './StudioBridgePage';
import KnowledgeGraphPage from './KnowledgeGraphPage';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/studio-bridge" element={<StudioBridgePage />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="*" element={<div>页面建设中</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export default App;
