import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from './components/Layout/PluginLayout';
import Dashboard from './pages/Dashboard';
import Collect from './pages/Collect';
import Metrics from './pages/Metrics';
import Product from './pages/Product';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="collect" element={<Collect />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="product" element={<Product />} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export { App };
