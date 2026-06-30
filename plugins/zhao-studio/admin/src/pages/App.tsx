import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from '../components/Layout/PluginLayout';
import HomePage from './HomePage';
import CollectPage from './CollectPage';
import AIConfigPage from './AIConfigPage';
import PublishPage from './PublishPage';
import PlatformConfigPage from './PlatformConfigPage';
import AccountConfigPage from './AccountConfigPage';
import AdSlotConfigPage from './AdSlotConfigPage';
import StatsBasicPage from './StatsBasicPage';
import StatsAdvancedPage from './StatsAdvancedPage';
import StatsProPage from './StatsProPage';

const App = () => (
  <ConfigProvider prefixCls="zs" iconPrefixCls="zs-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/collect" element={<CollectPage />} />
        <Route path="/ai-config" element={<AIConfigPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/platforms" element={<PlatformConfigPage />} />
        <Route path="/accounts" element={<AccountConfigPage />} />
        <Route path="/ad-slots" element={<AdSlotConfigPage />} />
        <Route path="/stats/basic" element={<StatsBasicPage />} />
        <Route path="/stats/advanced" element={<StatsAdvancedPage />} />
        <Route path="/stats/pro" element={<StatsProPage />} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export default App;
