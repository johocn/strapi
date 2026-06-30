# zhao-studio admin Ant Design 重写实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 zhao-studio admin 从 `@strapi/design-system` 重写为 antd v5，对齐 zhao-wealth 先例。

**Architecture:** 渐进式重写——先建基础设施（ConfigProvider + PluginLayout + App.tsx + 入口文件），再按 5 个业务模块逐个重写 pages 和 components，保持 hooks/utils 不动。每 Task 单独 commit，中间状态可运行。

**Tech Stack:** antd ^5.29.3、@ant-design/icons ^5.6.1、@ant-design/pro-components ^2.8.10、echarts ^6.1.0、echarts-for-react ^3.0.6、React 18、react-router-dom v6

**Spec:** `e:\code\basic\docs\superpowers\specs\2026-06-30-zhao-studio-admin-antd-rewrite-design.md`

**参考先例:** `e:\code\basic\plugins\zhao-wealth\admin\src\`（已完成 Ant Design 重写）

---

## 文件结构总览

**修改文件清单**（27 个 .tsx + 1 个 package.json = 28 个文件）：

| Task | 文件 | 操作 |
|---|---|---|
| 1 | `plugins/zhao-studio/package.json` | 修改 |
| 2 | `plugins/zhao-studio/admin/src/components/Layout/PluginLayout.tsx` | 新增 |
| 2 | `plugins/zhao-studio/admin/src/pages/App.tsx` | 重写 |
| 2 | `plugins/zhao-studio/admin/src/index.ts` | 重写 |
| 2 | `plugins/zhao-studio/admin/src/components/PluginIcon.tsx` | 重写 |
| 2 | `plugins/zhao-studio/admin/src/components/Initializer.tsx` | 重写 |
| 3 | `plugins/zhao-studio/admin/src/pages/HomePage.tsx` | 重写 |
| 3 | `plugins/zhao-studio/admin/src/components/OverviewCard.tsx` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/pages/CollectPage.tsx` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/components/SourceConfig.tsx` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/components/TitleSelector.tsx` | 重写 |
| 4 | `plugins/zhao-studio/admin/src/components/ContentPreview.tsx` | 重写 |
| 5 | `plugins/zhao-studio/admin/src/pages/PublishPage.tsx` | 重写 |
| 5 | `plugins/zhao-studio/admin/src/components/PublishPanel.tsx` | 重写 |
| 5 | `plugins/zhao-studio/admin/src/components/PublishRecordList.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/pages/PlatformConfigPage.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/pages/AccountConfigPage.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/pages/AdSlotConfigPage.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/components/PlatformForm.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/components/AccountForm.tsx` | 重写 |
| 6 | `plugins/zhao-studio/admin/src/components/AdSlotForm.tsx` | 重写 |
| 7 | `plugins/zhao-studio/admin/src/pages/StatsBasicPage.tsx` | 重写 |
| 7 | `plugins/zhao-studio/admin/src/components/StatsTable.tsx` | 重写 |
| 7 | `plugins/zhao-studio/admin/src/components/StatsChart.tsx` | 重写 |
| 8 | `plugins/zhao-studio/admin/src/pages/StatsAdvancedPage.tsx` | 重写 |
| 8 | `plugins/zhao-studio/admin/src/pages/StatsProPage.tsx` | 重写 |
| 9 | `plugins/zhao-studio/admin/src/pages/AIConfigPage.tsx` | 重写 |
| 9 | `plugins/zhao-studio/admin/src/components/AIConfigForm.tsx` | 重写 |
| 10 | `plugins/zhao-studio/admin/src/components/AIAssistant.tsx` | 重写 |
| 11 | - | 验证+清理 |

**不修改文件**：
- `admin/src/pluginId.ts`（保持不变）
- `admin/src/hooks/*`（10 个文件保持不变）
- `admin/src/utils/*`（8 个文件保持不变）
- `admin/custom.d.ts`、`admin/tsconfig.json`、`admin/tsconfig.build.json`（保持不变）
- `server/*`（本次仅 admin 重写）

---

## Task 1: 依赖与配置

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\package.json`

- [ ] **Step 1: 读取当前 package.json**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\package.json`。预期当前 peerDependencies 含 `@strapi/design-system` 和 `@strapi/icons`，dependencies 字段不存在或为空。

- [ ] **Step 2: 新增 dependencies 字段**

在 `devDependencies` 之前新增 `dependencies` 字段（对齐 zhao-wealth）：

```json
  "dependencies": {
    "@ant-design/icons": "^5.6.1",
    "@ant-design/pro-components": "^2.8.10",
    "antd": "^5.29.3",
    "echarts": "^6.1.0",
    "echarts-for-react": "^3.0.6"
  },
```

- [ ] **Step 3: 移除 peerDependencies 中的 design-system 与 icons**

使用 Edit 工具将：

```json
  "peerDependencies": {
    "@strapi/design-system": "^2.2.0",
    "@strapi/icons": "^2.2.0",
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.3",
    "styled-components": "^6.4.1"
  },
```

替换为：

```json
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.3",
    "styled-components": "^6.4.1"
  },
```

- [ ] **Step 4: 验证 JSON 合法性**

```powershell
Get-Content "e:\code\basic\plugins\zhao-studio\package.json" -Raw | ConvertFrom-Json | Out-Null
Write-Host "JSON valid"
```

Expected: 输出 `JSON valid`。

- [ ] **Step 5: 安装依赖**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm install
```

Expected: 无报错。若提示 peerDeps 警告可忽略。

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/package.json plugins/zhao-studio/package-lock.json
git commit -m "feat(zhao-studio): 添加 antd 依赖、移除 design-system peerDep"
```

---

## Task 2: 基础设施（PluginLayout + App + 入口文件）

**Files:**
- Create: `e:\code\basic\plugins\zhao-studio\admin\src\components\Layout\PluginLayout.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\App.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\index.ts`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\PluginIcon.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\Initializer.tsx`

- [ ] **Step 1: 创建 PluginLayout.tsx**

使用 Write 工具创建 `e:\code\basic\plugins\zhao-studio\admin\src\components\Layout\PluginLayout.tsx`，内容：

```tsx
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
```

- [ ] **Step 2: 重写 App.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\pages\App.tsx`，内容：

```tsx
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
```

- [ ] **Step 3: 重写 index.ts**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\index.ts`，内容：

```tsx
import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '内容工作室',
      },
      permissions: [
        {
          action: 'plugin::zhao-studio.read',
          subject: null,
        },
      ],
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
    });
    app.registerPlugin({
      id: pluginId,
      name: '内容工作室',
    });
  },
  bootstrap(app: any) {},
};
```

- [ ] **Step 4: 重写 PluginIcon.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\components\PluginIcon.tsx`，内容：

```tsx
import { RobotOutlined } from '@ant-design/icons';

const PluginIcon = () => <RobotOutlined />;

export { PluginIcon };
export default PluginIcon;
```

- [ ] **Step 5: 重写 Initializer.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\components\Initializer.tsx`，内容（对齐 zhao-wealth 先例）：

```tsx
import { useEffect, useRef } from 'react';
import pluginId from '../pluginId';

type InitializerProps = {
  setPlugin: (id: string) => void;
};

const Initializer = ({ setPlugin }: InitializerProps) => {
  const ref = useRef(setPlugin);

  useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

export { Initializer };
export default Initializer;
```

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/components/Layout plugins/zhao-studio/admin/src/pages/App.tsx plugins/zhao-studio/admin/src/index.ts plugins/zhao-studio/admin/src/components/PluginIcon.tsx plugins/zhao-studio/admin/src/components/Initializer.tsx
git commit -m "feat(zhao-studio): 重写基础设施（PluginLayout + ConfigProvider + 入口文件）"
```

---

## Task 3: 仪表盘模块（HomePage + OverviewCard）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\HomePage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\OverviewCard.tsx`

- [ ] **Step 1: 读取当前 OverviewCard.tsx 确认 props 接口**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\components\OverviewCard.tsx`。预期 props 接口为 `{ title: string; value: number; change: number; unit?: string; type?: 'number' | 'percent' | 'duration' }`，使用 `formatNumber`/`formatPercent` 工具函数。

- [ ] **Step 2: 重写 OverviewCard.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\components\OverviewCard.tsx`，内容：

```tsx
import React from 'react';
import { Card, Typography, Tag } from 'antd';
import { formatNumber, formatPercent } from '../utils/statsCalculator';

const { Text, Title } = Typography;

interface OverviewCardProps {
  title: string;
  value: number;
  change: number;
  unit?: string;
  type?: 'number' | 'percent' | 'duration';
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, change, unit = '', type = 'number' }) => {
  const formatValue = () => {
    if (type === 'percent') {
      return formatPercent(value);
    }
    if (type === 'duration') {
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
    }
    return formatNumber(value) + (unit ? ` ${unit}` : '');
  };

  const getChangeTag = () => {
    if (change === 0) {
      return <Tag>持平</Tag>;
    }
    if (change > 0) {
      return <Tag color="success">↑ {change}%</Tag>;
    }
    return <Tag color="error">↓ {Math.abs(change)}%</Tag>;
  };

  return (
    <Card>
      <Text type="secondary">{title}</Text>
      <Title level={3} style={{ marginTop: 8, marginBottom: 8 }}>
        {formatValue()}
      </Title>
      {getChangeTag()}
    </Card>
  );
};

export default OverviewCard;
```

- [ ] **Step 3: 重写 HomePage.tsx**

使用 Write 工具覆盖 `e:\code\basic\plugins\zhao-studio\admin\src\pages\HomePage.tsx`，内容：

```tsx
import React from 'react';
import { Row, Col, Typography, Card, Space } from 'antd';
import OverviewCard from '../components/OverviewCard';

const { Title, Paragraph, Text } = Typography;

const HomePage = () => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={2}>内容工作室</Title>
        <Paragraph type="secondary">
          定向采集 → 二次加工 → 多渠道分发 → C端展示 → 广告转化统计
        </Paragraph>
      </Card>

      <div>
        <Title level={4}>今日概览</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="采集文章" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="发布文章" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="总浏览" value={0} change={0} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <OverviewCard title="广告收入" value={0} change={0} unit="元" />
          </Col>
        </Row>
      </div>
    </Space>
  );
};

export default HomePage;
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/HomePage.tsx plugins/zhao-studio/admin/src/components/OverviewCard.tsx
git commit -m "feat(zhao-studio): 重写仪表盘模块（HomePage + OverviewCard）"
```

---

## Task 4: 采集管理模块（CollectPage + 3 组件）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\CollectPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\SourceConfig.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\TitleSelector.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\ContentPreview.tsx`

- [ ] **Step 1: 读取 4 个源文件了解结构**

使用 Read 工具读取以下文件：
- `e:\code\basic\plugins\zhao-studio\admin\src\pages\CollectPage.tsx`
- `e:\code\basic\plugins\zhao-studio\admin\src\components\SourceConfig.tsx`
- `e:\code\basic\plugins\zhao-studio\admin\src\components\TitleSelector.tsx`
- `e:\code\basic\plugins\zhao-studio\admin\src\components\ContentPreview.tsx`

确认每个组件的 props 接口与业务逻辑。

- [ ] **Step 2: 重写 SourceConfig.tsx**

使用 Write 工具覆盖，内容（基于源 props 接口 + antd Form）：

```tsx
import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';
import { CollectSource } from '../hooks/useCollectSources';

interface SourceConfigProps {
  source?: CollectSource | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const SourceConfig: React.FC<SourceConfigProps> = ({ source, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (source) {
      form.setFieldsValue(source);
    } else {
      form.resetFields();
    }
  }, [source, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSave(values);
    });
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="url" label="URL" rules={[{ required: true, message: '请输入URL' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="type" label="类型" initialValue="custom">
        <Select options={[
          { value: 'template', label: '模板' },
          { value: 'custom', label: '自定义' },
        ]} />
      </Form.Item>
      <Form.Item name="template" label="模板">
        <Input />
      </Form.Item>
      <Form.Item name="titleSelector" label="标题选择器">
        <Input />
      </Form.Item>
      <Form.Item name="contentSelector" label="内容选择器">
        <Input />
      </Form.Item>
      <Form.Item name="authorSelector" label="作者选择器">
        <Input />
      </Form.Item>
      <Form.Item name="dateSelector" label="日期选择器">
        <Input />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default SourceConfig;
```

- [ ] **Step 3: 重写 TitleSelector.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Checkbox, Button, Space, Typography, List } from 'antd';

const { Title } = Typography;

interface TitleSelectorProps {
  titles: string[];
  onSelectionChange: (selected: string[]) => void;
  onFetchContent: () => void;
}

const TitleSelector: React.FC<TitleSelectorProps> = ({ titles, onSelectionChange, onFetchContent }) => {
  const [selected, setSelected] = React.useState<string[]>([]);

  const handleToggle = (title: string) => {
    const next = selected.includes(title)
      ? selected.filter((t) => t !== title)
      : [...selected, title];
    setSelected(next);
    onSelectionChange(next);
  };

  const handleSelectAll = () => {
    setSelected(titles);
    onSelectionChange(titles);
  };

  const handleClear = () => {
    setSelected([]);
    onSelectionChange([]);
  };

  return (
    <Card
      title="选择要采集的标题"
      extra={
        <Space>
          <Button size="small" onClick={handleSelectAll}>全选</Button>
          <Button size="small" onClick={handleClear}>清空</Button>
        </Space>
      }
    >
      <List
        dataSource={titles}
        renderItem={(title) => (
          <List.Item>
            <Checkbox
              checked={selected.includes(title)}
              onChange={() => handleToggle(title)}
            >
              {title}
            </Checkbox>
          </List.Item>
        )}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" onClick={onFetchContent} disabled={selected.length === 0}>
          获取内容（{selected.length}）
        </Button>
      </div>
    </Card>
  );
};

export default TitleSelector;
```

- [ ] **Step 4: 重写 ContentPreview.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Button, Space, Typography, Tag, List } from 'antd';

const { Title, Paragraph, Text } = Typography;

interface ContentItem {
  title: string;
  content: string;
  author?: string;
  date?: string;
  url?: string;
}

interface ContentPreviewProps {
  contents: ContentItem[];
  onConfirm: (confirmed: ContentItem[]) => void;
  onCancel: () => void;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ contents, onConfirm, onCancel }) => {
  const [excluded, setExcluded] = React.useState<string[]>([]);

  const handleToggle = (title: string) => {
    setExcluded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleConfirm = () => {
    const confirmed = contents.filter((c) => !excluded.includes(c.title));
    onConfirm(confirmed);
  };

  return (
    <Card
      title="内容预览"
      extra={
        <Space>
          <Button onClick={onCancel}>返回</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认导入（{contents.length - excluded.length}）
          </Button>
        </Space>
      }
    >
      <List
        dataSource={contents}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                size="small"
                onClick={() => handleToggle(item.title)}
                key="toggle"
              >
                {excluded.includes(item.title) ? '恢复' : '排除'}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{item.title}</Text>
                  {excluded.includes(item.title) && <Tag color="error">已排除</Tag>}
                </Space>
              }
              description={
                <>
                  {item.author && <Text type="secondary">作者: {item.author}</Text>}
                  {item.date && <Text type="secondary"> 日期: {item.date}</Text>}
                  <Paragraph
                    ellipsis={{ rows: 3 }}
                    style={{ marginTop: 8, marginBottom: 0 }}
                  >
                    {item.content}
                  </Paragraph>
                </>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ContentPreview;
```

- [ ] **Step 5: 重写 CollectPage.tsx**

使用 Write 工具覆盖，内容（使用 antd Modal 替代手写 Modal）：

```tsx
import React from 'react';
import { Card, Typography, Button, Badge, Space, Modal, List, Tag } from 'antd';
import { useCollectSources } from '../hooks/useCollectSources';
import { useCollectTasks } from '../hooks/useCollectTasks';
import SourceConfig from '../components/SourceConfig';
import TitleSelector from '../components/TitleSelector';
import ContentPreview from '../components/ContentPreview';

const { Title, Text } = Typography;

const CollectPage = () => {
  const {
    sources,
    loading: sourcesLoading,
    createSource,
    updateSource,
    deleteSource,
  } = useCollectSources();

  const {
    tasks,
    loading: tasksLoading,
    createTask,
    getTask,
    fetchSelectedContent,
    confirmImport,
  } = useCollectTasks();

  const [showSourceModal, setShowSourceModal] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<any>(null);
  const [currentTask, setCurrentTask] = React.useState<any>(null);
  const [selectedTitles, setSelectedTitles] = React.useState<string[]>([]);
  const [fetchedContents, setFetchedContents] = React.useState<any[]>([]);
  const [step, setStep] = React.useState<'list' | 'select' | 'preview'>('list');

  const handleCreateSource = () => {
    setEditingSource(null);
    setShowSourceModal(true);
  };

  const handleEditSource = (source: any) => {
    setEditingSource(source);
    setShowSourceModal(true);
  };

  const handleSaveSource = async (data: any) => {
    if (editingSource) {
      await updateSource(editingSource.id, data);
    } else {
      await createSource(data);
    }
    setShowSourceModal(false);
  };

  const handleStartCollect = async (sourceId: string) => {
    const task = await createTask(sourceId);
    setCurrentTask(task);
    setStep('select');
  };

  const handleFetchContent = async () => {
    const contents = await fetchSelectedContent(currentTask.id, selectedTitles);
    setFetchedContents(contents);
    setStep('preview');
  };

  const handleConfirmImport = async (confirmedContents: any[]) => {
    await confirmImport(currentTask.id, confirmedContents);
    setStep('list');
    setCurrentTask(null);
    setSelectedTitles([]);
    setFetchedContents([]);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>采集管理</Title>
        <Text type="secondary">定向采集内容</Text>
      </div>

      {step === 'list' && (
        <Card
          title="采集源列表"
          extra={<Button type="primary" onClick={handleCreateSource}>创建采集源</Button>}
        >
          <List
            loading={sourcesLoading}
            dataSource={sources}
            renderItem={(source: any) => (
              <List.Item
                actions={[
                  <Button key="edit" onClick={() => handleEditSource(source)}>编辑</Button>,
                  <Button key="collect" type="primary" onClick={() => handleStartCollect(source.id)}>
                    开始采集
                  </Button>,
                  <Button key="delete" danger onClick={() => deleteSource(source.id)}>
                    删除
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{source.name}</Text>
                      <Tag color={source.type === 'template' ? 'success' : 'warning'}>
                        {source.type === 'template' ? '模板' : '自定义'}
                      </Tag>
                      <Tag color={source.isActive ? 'success' : 'error'}>
                        {source.isActive ? '启用' : '禁用'}
                      </Tag>
                    </Space>
                  }
                  description={<Text type="secondary">{source.url}</Text>}
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {step === 'select' && currentTask && (
        <TitleSelector
          titles={currentTask.titles || []}
          onSelectionChange={setSelectedTitles}
          onFetchContent={handleFetchContent}
        />
      )}

      {step === 'preview' && (
        <ContentPreview
          contents={fetchedContents}
          onConfirm={handleConfirmImport}
          onCancel={() => setStep('select')}
        />
      )}

      <Modal
        open={showSourceModal}
        title={editingSource ? '编辑采集源' : '创建采集源'}
        onCancel={() => setShowSourceModal(false)}
        footer={null}
        destroyOnClose
      >
        <SourceConfig
          source={editingSource}
          onSave={handleSaveSource}
          onCancel={() => setShowSourceModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default CollectPage;
```

- [ ] **Step 6: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/CollectPage.tsx plugins/zhao-studio/admin/src/components/SourceConfig.tsx plugins/zhao-studio/admin/src/components/TitleSelector.tsx plugins/zhao-studio/admin/src/components/ContentPreview.tsx
git commit -m "feat(zhao-studio): 重写采集管理模块（CollectPage + 3 组件）"
```

---

## Task 5: 发布管理 - 主页面（PublishPage + PublishPanel + PublishRecordList）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\PublishPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\PublishPanel.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\PublishRecordList.tsx`

- [ ] **Step 1: 读取 3 个源文件了解结构**

使用 Read 工具读取：
- `e:\code\basic\plugins\zhao-studio\admin\src\pages\PublishPage.tsx`
- `e:\code\basic\plugins\zhao-studio\admin\src\components\PublishPanel.tsx`
- `e:\code\basic\plugins\zhao-studio\admin\src\components\PublishRecordList.tsx`

- [ ] **Step 2: 重写 PublishRecordList.tsx**

使用 Write 工具覆盖，内容（基于源 props 接口 + antd Table）：

```tsx
import React from 'react';
import { Table, Tag, Space, Typography } from 'antd';
import { usePublishRecords } from '../hooks/usePublishRecords';

const { Text } = Typography;

interface PublishRecordListProps {
  platformId?: string;
  accountId?: string;
}

const PublishRecordList: React.FC<PublishRecordListProps> = ({ platformId, accountId }) => {
  const { records, loading } = usePublishRecords({ platformId, accountId });

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          publishing: 'processing',
          success: 'success',
          failed: 'error',
        };
        const labelMap: Record<string, string> = {
          pending: '待发布',
          publishing: '发布中',
          success: '成功',
          failed: '失败',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt' },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (msg: string) => msg ? <Text type="danger">{msg}</Text> : '-',
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={records}
      rowKey="id"
      loading={loading}
      pagination={{ pageSize: 10 }}
    />
  );
};

export default PublishRecordList;
```

- [ ] **Step 3: 重写 PublishPanel.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Tabs, Card, Button, Space, Select, message } from 'antd';
import PublishRecordList from './PublishRecordList';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishActions } from '../hooks/usePublishActions';

const PublishPanel: React.FC<{ articleIds: string[] }> = ({ articleIds }) => {
  const { platforms } = usePublishPlatforms();
  const { accounts, fetchAccounts } = usePublishAccounts();
  const { publish, loading } = usePublishActions();
  const [selectedPlatform, setSelectedPlatform] = React.useState<string>();
  const [selectedAccount, setSelectedAccount] = React.useState<string>();

  React.useEffect(() => {
    if (selectedPlatform) {
      fetchAccounts(selectedPlatform);
    }
  }, [selectedPlatform, fetchAccounts]);

  const handlePublish = async () => {
    if (!selectedPlatform || !selectedAccount) {
      message.warning('请选择平台和账号');
      return;
    }
    if (articleIds.length === 0) {
      message.warning('请选择要发布的文章');
      return;
    }
    try {
      await publish({
        articleIds,
        platformId: selectedPlatform,
        accountId: selectedAccount,
      });
      message.success('发布任务已创建');
    } catch (err) {
      message.error('发布失败');
    }
  };

  return (
    <Tabs
      items={[
        {
          key: 'publish',
          label: '发布',
          children: (
            <Card>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Select
                  placeholder="选择平台"
                  style={{ width: '100%' }}
                  value={selectedPlatform}
                  onChange={(v) => {
                    setSelectedPlatform(v);
                    setSelectedAccount(undefined);
                  }}
                  options={platforms.map((p: any) => ({ value: p.id, label: p.name }))}
                />
                <Select
                  placeholder="选择账号"
                  style={{ width: '100%' }}
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                  options={accounts.map((a: any) => ({ value: a.id, label: a.name }))}
                  disabled={!selectedPlatform}
                />
                <Button
                  type="primary"
                  onClick={handlePublish}
                  loading={loading}
                  disabled={articleIds.length === 0}
                >
                  发布选中文章（{articleIds.length}）
                </Button>
              </Space>
            </Card>
          ),
        },
        {
          key: 'records',
          label: '发布记录',
          children: <PublishRecordList />,
        },
      ]}
    />
  );
};

export default PublishPanel;
```

- [ ] **Step 4: 重写 PublishPage.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Typography, Space, Table, Button } from 'antd';
import PublishPanel from '../components/PublishPanel';

const { Title, Text } = Typography;

const PublishPage = () => {
  const [selectedArticleIds, setSelectedArticleIds] = React.useState<string[]>([]);
  const [articles, setArticles] = React.useState<any[]>([]);

  // 这里应该调用 article drafts API，简化为空数组占位
  React.useEffect(() => {
    setArticles([]);
  }, []);

  const columns = [
    {
      title: '选择',
      key: 'select',
      render: (_, record) => ({
        children: (
          <input
            type="checkbox"
            checked={selectedArticleIds.includes(record.id)}
            onChange={(e) => {
              setSelectedArticleIds((prev) =>
                e.target.checked
                  ? [...prev, record.id]
                  : prev.filter((id) => id !== record.id)
              );
            }}
          />
        ),
      }),
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>内容发布</Title>
        <Text type="secondary">多渠道内容分发</Text>
      </div>

      <Card title="待发布文章">
        <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无待发布文章' }}
        />
      </Card>

      {selectedArticleIds.length > 0 && (
        <Card title="发布操作">
          <PublishPanel articleIds={selectedArticleIds} />
        </Card>
      )}
    </Space>
  );
};

export default PublishPage;
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/PublishPage.tsx plugins/zhao-studio/admin/src/components/PublishPanel.tsx plugins/zhao-studio/admin/src/components/PublishRecordList.tsx
git commit -m "feat(zhao-studio): 重写发布管理主页面（PublishPage + PublishPanel + PublishRecordList）"
```

---

## Task 6: 发布管理 - 配置页（6 文件）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\PlatformConfigPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\AccountConfigPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\AdSlotConfigPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\PlatformForm.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\AccountForm.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\AdSlotForm.tsx`

- [ ] **Step 1: 读取 6 个源文件了解结构**

使用 Read 工具读取上述 6 个文件。

- [ ] **Step 2: 重写 PlatformForm.tsx**

使用 Write 工具覆盖，内容（antd Form 模式，与 SourceConfig 结构一致）：

```tsx
import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';

interface PlatformFormProps {
  platform?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const PlatformForm: React.FC<PlatformFormProps> = ({ platform, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (platform) {
      form.setFieldsValue(platform);
    } else {
      form.resetFields();
    }
  }, [platform, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="平台名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="type" label="平台类型" rules={[{ required: true }]}>
        <Select options={[
          { value: 'wechat', label: '微信公众号' },
          { value: 'toutiao', label: '今日头条' },
          { value: 'douyin', label: '抖音' },
          { value: 'xhs', label: '小红书' },
          { value: 'web', label: '网站' },
        ]} />
      </Form.Item>
      <Form.Item name="appId" label="AppID">
        <Input />
      </Form.Item>
      <Form.Item name="appSecret" label="AppSecret">
        <Input.Password />
      </Form.Item>
      <Form.Item name="callbackUrl" label="回调URL">
        <Input />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default PlatformForm;
```

- [ ] **Step 3: 重写 AccountForm.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Form, Input, Select, Switch, Button, Space } from 'antd';

interface AccountFormProps {
  account?: any;
  platforms?: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, platforms = [], onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (account) {
      form.setFieldsValue(account);
    } else {
      form.resetFields();
    }
  }, [account, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="账号名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="platformId" label="所属平台" rules={[{ required: true }]}>
        <Select
          options={platforms.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="选择平台"
        />
      </Form.Item>
      <Form.Item name="accountId" label="平台账号ID">
        <Input />
      </Form.Item>
      <Form.Item name="accessToken" label="Access Token">
        <Input.Password />
      </Form.Item>
      <Form.Item name="refreshToken" label="Refresh Token">
        <Input.Password />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AccountForm;
```

- [ ] **Step 4: 重写 AdSlotForm.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Form, Input, InputNumber, Select, Switch, Button, Space } from 'antd';

interface AdSlotFormProps {
  slot?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AdSlotForm: React.FC<AdSlotFormProps> = ({ slot, onSave, onCancel }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (slot) {
      form.setFieldsValue(slot);
    } else {
      form.resetFields();
    }
  }, [slot, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="name" label="广告位名称" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="position" label="广告位置" rules={[{ required: true }]}>
        <Select options={[
          { value: 'header', label: '顶部' },
          { value: 'footer', label: '底部' },
          { value: 'sidebar', label: '侧边栏' },
          { value: 'inarticle', label: '文章内嵌' },
        ]} />
      </Form.Item>
      <Form.Item name="type" label="广告类型">
        <Select options={[
          { value: 'image', label: '图片' },
          { value: 'text', label: '文字' },
          { value: 'video', label: '视频' },
        ]} />
      </Form.Item>
      <Form.Item name="width" label="宽度">
        <InputNumber />
      </Form.Item>
      <Form.Item name="height" label="高度">
        <InputNumber />
      </Form.Item>
      <Form.Item name="adCode" label="广告代码">
        <Input.TextArea rows={4} />
      </Form.Item>
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AdSlotForm;
```

- [ ] **Step 5: 重写 PlatformConfigPage.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import PlatformForm from '../components/PlatformForm';

const { Title, Text } = Typography;

const PlatformConfigPage = () => {
  const { platforms, loading, createPlatform, updatePlatform, deletePlatform } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deletePlatform(record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>平台配置</Title>
        <Text type="secondary">管理发布平台</Text>
      </div>
      <Card
        title="平台列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增平台</Button>}
      >
        <Table columns={columns} dataSource={platforms} rowKey="id" loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑平台' : '新增平台'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <PlatformForm
          platform={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await updatePlatform(editing.id, data);
              } else {
                await createPlatform(data);
              }
              message.success('保存成功');
              setShowModal(false);
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default PlatformConfigPage;
```

- [ ] **Step 6: 重写 AccountConfigPage.tsx**

使用 Write 工具覆盖，内容（结构同 PlatformConfigPage）：

```tsx
import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import AccountForm from '../components/AccountForm';

const { Title, Text } = Typography;

const AccountConfigPage = () => {
  const { accounts, loading, createAccount, updateAccount, deleteAccount } = usePublishAccounts();
  const { platforms } = usePublishPlatforms();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '平台',
      dataIndex: 'platformName',
      key: 'platformName',
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteAccount(record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>账号配置</Title>
        <Text type="secondary">管理各平台的发布账号</Text>
      </div>
      <Card
        title="账号列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增账号</Button>}
      >
        <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑账号' : '新增账号'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <AccountForm
          account={editing}
          platforms={platforms}
          onSave={async (data) => {
            try {
              if (editing) {
                await updateAccount(editing.id, data);
              } else {
                await createAccount(data);
              }
              message.success('保存成功');
              setShowModal(false);
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default AccountConfigPage;
```

- [ ] **Step 7: 重写 AdSlotConfigPage.tsx**

使用 Write 工具覆盖，内容（结构同上）：

```tsx
import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { useAdSlots } from '../hooks/useAdSlots';
import AdSlotForm from '../components/AdSlotForm';

const { Title, Text } = Typography;

const AdSlotConfigPage = () => {
  const { slots, loading, createSlot, updateSlot, deleteSlot } = useAdSlots();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '位置', dataIndex: 'position', key: 'position' },
    { title: '类型', dataIndex: 'type', key: 'type' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteSlot(record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>广告位配置</Title>
        <Text type="secondary">管理广告位</Text>
      </div>
      <Card
        title="广告位列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增广告位</Button>}
      >
        <Table columns={columns} dataSource={slots} rowKey="id" loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑广告位' : '新增广告位'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
      >
        <AdSlotForm
          slot={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await updateSlot(editing.id, data);
              } else {
                await createSlot(data);
              }
              message.success('保存成功');
              setShowModal(false);
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default AdSlotConfigPage;
```

- [ ] **Step 8: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/PlatformConfigPage.tsx plugins/zhao-studio/admin/src/pages/AccountConfigPage.tsx plugins/zhao-studio/admin/src/pages/AdSlotConfigPage.tsx plugins/zhao-studio/admin/src/components/PlatformForm.tsx plugins/zhao-studio/admin/src/components/AccountForm.tsx plugins/zhao-studio/admin/src/components/AdSlotForm.tsx
git commit -m "feat(zhao-studio): 重写发布管理配置页（3 页面 + 3 表单）"
```

---

## Task 7: 统计模块 - 基础（StatsBasicPage + StatsTable + StatsChart）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\StatsBasicPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\StatsTable.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\StatsChart.tsx`

- [ ] **Step 1: 读取 3 个源文件了解结构**

使用 Read 工具读取上述 3 个文件。

- [ ] **Step 2: 重写 StatsChart.tsx**

使用 Write 工具覆盖，内容（用 echarts-for-react）：

```tsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface ChartData {
  date: string;
  value: number;
}

interface StatsChartProps {
  data: ChartData[];
  type?: 'line' | 'bar';
  height?: number;
  loading?: boolean;
  title?: string;
}

const StatsChart: React.FC<StatsChartProps> = ({
  data,
  type = 'line',
  height = 300,
  loading = false,
  title,
}) => {
  const option = {
    title: title ? { text: title } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
    },
    yAxis: { type: 'value' },
    series: [
      {
        data: data.map((d) => d.value),
        type,
        smooth: type === 'line',
        itemStyle: { color: '#1677ff' },
      },
    ],
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  };

  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  return <ReactECharts option={option} style={{ height }} />;
};

export default StatsChart;
```

- [ ] **Step 3: 重写 StatsTable.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Table, Tag } from 'antd';

interface StatsTableRow {
  key: string;
  name: string;
  value: number;
  change?: number;
  unit?: string;
}

interface StatsTableProps {
  data: StatsTableRow[];
  loading?: boolean;
  title?: string;
}

const StatsTable: React.FC<StatsTableProps> = ({ data, loading = false }) => {
  const columns = [
    { title: '指标', dataIndex: 'name', key: 'name' },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number, record: StatsTableRow) =>
        `${value.toLocaleString()}${record.unit ? ' ' + record.unit : ''}`,
    },
    {
      title: '变化',
      dataIndex: 'change',
      key: 'change',
      render: (change?: number) => {
        if (change === undefined || change === 0) return <Tag>持平</Tag>;
        return change > 0
          ? <Tag color="success">↑ {change}%</Tag>
          : <Tag color="error">↓ {Math.abs(change)}%</Tag>;
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      rowKey="key"
    />
  );
};

export default StatsTable;
```

- [ ] **Step 4: 重写 StatsBasicPage.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Typography, Space, Row, Col, DatePicker } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsBasicPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'basic' });
  const [dateRange, setDateRange] = React.useState<any>();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>基础统计</Title>
        <Text type="secondary">文章浏览量、发布量等基础指标</Text>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Text>时间范围：</Text>
          <RangePicker onChange={setDateRange} />
        </Space>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="趋势图" size="small">
              <StatsChart data={chartData || []} type="line" loading={loading} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="指标明细" size="small">
              <StatsTable data={stats || []} loading={loading} />
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default StatsBasicPage;
```

- [ ] **Step 5: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/StatsBasicPage.tsx plugins/zhao-studio/admin/src/components/StatsTable.tsx plugins/zhao-studio/admin/src/components/StatsChart.tsx
git commit -m "feat(zhao-studio): 重写统计基础模块（StatsBasicPage + StatsTable + StatsChart）"
```

---

## Task 8: 统计模块 - 高级/专业（StatsAdvancedPage + StatsProPage）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\StatsAdvancedPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\StatsProPage.tsx`

- [ ] **Step 1: 读取 2 个源文件了解结构**

使用 Read 工具读取上述 2 个文件。

- [ ] **Step 2: 重写 StatsAdvancedPage.tsx**

使用 Write 工具覆盖，内容（复用 StatsChart + StatsTable + 新增 Tabs 切换维度）：

```tsx
import React from 'react';
import { Card, Typography, Space, Tabs, Row, Col, DatePicker } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsAdvancedPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'advanced' });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>高级统计</Title>
        <Text type="secondary">多维度数据分析</Text>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Text>时间范围：</Text>
          <RangePicker />
        </Space>
        <Tabs
          items={[
            {
              key: 'overview',
              label: '总览',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={14}>
                    <Card title="趋势" size="small">
                      <StatsChart data={chartData || []} type="line" loading={loading} height={350} />
                    </Card>
                  </Col>
                  <Col xs={24} lg={10}>
                    <Card title="明细" size="small">
                      <StatsTable data={stats || []} loading={loading} />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'comparison',
              label: '对比分析',
              children: (
                <Card title="对比图表" size="small">
                  <StatsChart data={chartData || []} type="bar" loading={loading} height={350} />
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
};

export default StatsAdvancedPage;
```

- [ ] **Step 3: 重写 StatsProPage.tsx**

使用 Write 工具覆盖，内容（专业版：多维图表 + 明细表）：

```tsx
import React from 'react';
import { Card, Typography, Space, Row, Col, DatePicker, Select } from 'antd';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { useStats } from '../hooks/useStats';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const StatsProPage = () => {
  const { stats, chartData, loading } = useStats({ type: 'pro' });
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>专业统计</Title>
        <Text type="secondary">完整业务数据分析</Text>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Text>时间范围：</Text>
          <RangePicker />
          <Text>图表类型：</Text>
          <Select
            value={chartType}
            onChange={setChartType}
            style={{ width: 120 }}
            options={[
              { value: 'line', label: '折线图' },
              { value: 'bar', label: '柱状图' },
            ]}
          />
        </Space>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card title="主图表" size="small">
              <StatsChart data={chartData || []} type={chartType} loading={loading} height={400} />
            </Card>
          </Col>
          <Col xs={24}>
            <Card title="完整明细" size="small">
              <StatsTable data={stats || []} loading={loading} />
            </Card>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default StatsProPage;
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/StatsAdvancedPage.tsx plugins/zhao-studio/admin/src/pages/StatsProPage.tsx
git commit -m "feat(zhao-studio): 重写统计高级/专业页面"
```

---

## Task 9: AI 配置模块（AIConfigPage + AIConfigForm）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\pages\AIConfigPage.tsx`
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\AIConfigForm.tsx`

- [ ] **Step 1: 读取 2 个源文件了解结构**

使用 Read 工具读取上述 2 个文件。

- [ ] **Step 2: 重写 AIConfigForm.tsx**

使用 Write 工具覆盖，内容（动态表单：provider 选择 + API Key + Model）：

```tsx
import React from 'react';
import { Form, Input, Select, Switch, Button, Space, Divider, message } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';

interface AIConfigFormProps {
  config?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AIConfigForm: React.FC<AIConfigFormProps> = ({ config, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const { testConfig } = useAIConfig();

  React.useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    } else {
      form.resetFields();
    }
  }, [config, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => onSave(values));
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      await testConfig(values);
      message.success('配置测试成功');
    } catch {
      message.error('配置测试失败');
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item name="provider" label="AI 服务商" rules={[{ required: true }]}>
        <Select options={[
          { value: 'openai', label: 'OpenAI' },
          { value: 'azure', label: 'Azure OpenAI' },
          { value: 'claude', label: 'Anthropic Claude' },
          { value: 'qwen', label: '阿里通义千问' },
          { value: 'wenxin', label: '百度文心一言' },
          { value: 'zhipu', label: '智谱 GLM' },
        ]} />
      </Form.Item>
      <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="apiBase" label="API Base URL">
        <Input placeholder="留空使用默认" />
      </Form.Item>
      <Form.Item name="model" label="模型名称">
        <Input placeholder="gpt-4, gpt-3.5-turbo 等" />
      </Form.Item>
      <Form.Item name="temperature" label="温度参数" initialValue={0.7}>
        <Select options={[
          { value: 0, label: '0 (精确)' },
          { value: 0.3, label: '0.3 (低)' },
          { value: 0.7, label: '0.7 (中)' },
          { value: 1, label: '1.0 (高)' },
        ]} />
      </Form.Item>
      <Form.Item name="maxTokens" label="最大 Token 数">
        <Input />
      </Form.Item>
      <Divider />
      <Form.Item name="isActive" label="启用" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" onClick={handleSubmit}>保存</Button>
          <Button onClick={handleTest}>测试配置</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default AIConfigForm;
```

- [ ] **Step 3: 重写 AIConfigPage.tsx**

使用 Write 工具覆盖，内容：

```tsx
import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Modal, Popconfirm, message } from 'antd';
import { useAIConfig } from '../hooks/useAIConfig';
import AIConfigForm from '../components/AIConfigForm';

const { Title, Text } = Typography;

const AIConfigPage = () => {
  const { configs, loading, createConfig, updateConfig, deleteConfig } = useAIConfig();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);

  const columns = [
    { title: '服务商', dataIndex: 'provider', key: 'provider' },
    { title: '模型', dataIndex: 'model', key: 'model' },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(record); setShowModal(true); }}>编辑</Button>
          <Popconfirm
            title="确认删除?"
            onConfirm={async () => {
              try {
                await deleteConfig(record.id);
                message.success('删除成功');
              } catch {
                message.error('删除失败');
              }
            }}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3}>AI 配置</Title>
        <Text type="secondary">管理 AI 服务商配置</Text>
      </div>
      <Card
        title="配置列表"
        extra={<Button type="primary" onClick={() => { setEditing(null); setShowModal(true); }}>新增配置</Button>}
      >
        <Table columns={columns} dataSource={configs} rowKey="id" loading={loading} />
      </Card>
      <Modal
        open={showModal}
        title={editing ? '编辑 AI 配置' : '新增 AI 配置'}
        onCancel={() => setShowModal(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <AIConfigForm
          config={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await updateConfig(editing.id, data);
              } else {
                await createConfig(data);
              }
              message.success('保存成功');
              setShowModal(false);
            } catch {
              message.error('保存失败');
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </Space>
  );
};

export default AIConfigPage;
```

- [ ] **Step 4: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/pages/AIConfigPage.tsx plugins/zhao-studio/admin/src/components/AIConfigForm.tsx
git commit -m "feat(zhao-studio): 重写 AI 配置模块（AIConfigPage + AIConfigForm）"
```

---

## Task 10: AI 助手组件（AIAssistant）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-studio\admin\src\components\AIAssistant.tsx`

- [ ] **Step 1: 读取源文件了解结构**

使用 Read 工具读取 `e:\code\basic\plugins\zhao-studio\admin\src\components\AIAssistant.tsx`。

- [ ] **Step 2: 重写 AIAssistant.tsx**

使用 Write 工具覆盖，内容（聊天 UI：消息列表 + 输入框）：

```tsx
import React from 'react';
import { Card, Input, Button, Space, Avatar, Spin, Typography } from 'antd';
import { RobotOutlined, UserOutlined, SendOutlined } from '@ant-design/icons';
import { useAIActions } from '../hooks/useAIActions';

const { Text, Paragraph } = Typography;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC = () => {
  const { chat, loading } = useAIActions();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const response = await chat(userMsg.content);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content || '（无回复）',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后再试。',
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          <span>AI 助手</span>
        </Space>
      }
      bodyStyle={{ padding: 0 }}
    >
      <div
        ref={containerRef}
        style={{
          height: 400,
          overflowY: 'auto',
          padding: 16,
          background: '#fafafa',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
            <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>有什么可以帮你的吗？</div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              marginBottom: 16,
            }}
          >
            <Avatar
              icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
              style={{
                backgroundColor: msg.role === 'user' ? '#1677ff' : '#52c41a',
                marginRight: msg.role === 'user' ? 0 : 8,
                marginLeft: msg.role === 'user' ? 8 : 0,
              }}
            />
            <div
              style={{
                maxWidth: '70%',
                padding: '8px 12px',
                background: msg.role === 'user' ? '#1677ff' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#000',
                borderRadius: 8,
                border: msg.role === 'user' ? 'none' : '1px solid #e8e8e8',
              }}
            >
              <Paragraph style={{ margin: 0, color: 'inherit', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </Paragraph>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Spin />
          </div>
        )}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="输入消息..."
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
            disabled={!input.trim()}
          >
            发送
          </Button>
        </Space.Compact>
      </div>
    </Card>
  );
};

export default AIAssistant;
```

- [ ] **Step 3: Commit**

```bash
cd e:/code/basic
git add plugins/zhao-studio/admin/src/components/AIAssistant.tsx
git commit -m "feat(zhao-studio): 重写 AI 助手组件（AIAssistant）"
```

---

## Task 11: 启动验证与清理

**Files:** 无文件变更，仅验证与清理

- [ ] **Step 1: 扫描残留 design-system 导入**

使用 Grep 工具搜索 `e:\code\basic\plugins\zhao-studio\admin\src`：

```
pattern: @strapi/design-system
```

Expected: **无匹配**。

如果有匹配，使用 Edit 工具逐个替换为 antd 等价导入。

- [ ] **Step 2: 扫描残留 @strapi/icons 导入**

使用 Grep 工具搜索 `e:\code\basic\plugins\zhao-studio\admin\src`：

```
pattern: @strapi/icons
```

Expected: **无匹配**。

如果有匹配（除 PluginIcon.tsx 已重写外），使用 Edit 替换为 `@ant-design/icons`。

- [ ] **Step 3: 构建 admin**

```powershell
cd e:\code\basic\plugins\zhao-studio
npm run build
```

Expected: 构建成功无错误。若报 TypeScript 错误，逐个修复（通常是 props 类型不匹配或 import 路径错误）。

- [ ] **Step 4: 启动 Strapi 验证**

```powershell
cd e:\code\basic
npm run develop
```

非阻塞运行，等待 30-60 秒启动完成。

- [ ] **Step 5: 验证 admin 入口可访问**

浏览器打开 `http://localhost:1337/admin/plugins/zhao-studio`

Expected：
- 显示 PluginLayout（左侧菜单 10 项 + 右侧内容区）
- 无白屏、无控制台错误
- 菜单项可点击切换路由

- [ ] **Step 6: 验证各页面可加载**

依次点击菜单进入 10 个页面：
- 仪表盘（HomePage）：显示概览卡片
- 采集管理（CollectPage）：显示采集源列表（可能为空）
- 内容发布（PublishPage）：显示待发布文章表格
- 基础统计（StatsBasicPage）：显示图表占位
- 高级统计（StatsAdvancedPage）：显示 Tabs
- 专业统计（StatsProPage）：显示图表+表格
- 平台配置（PlatformConfigPage）：显示平台列表
- 账号配置（AccountConfigPage）：显示账号列表
- 广告位配置（AdSlotConfigPage）：显示广告位列表
- AI 配置（AIConfigPage）：显示 AI 配置列表

Expected: 所有页面可加载无白屏。

- [ ] **Step 7: 停止 Strapi**

使用 StopCommand 工具停止 Strapi 进程。

- [ ] **Step 8: 最终 Commit（若有修复）**

```bash
cd e:/code/basic
git status plugins/zhao-studio
```

如果有未提交变更（清理残留导入或修复编译错误）：

```bash
git add plugins/zhao-studio
git commit -m "fix(zhao-studio): 清理残留 design-system 导入 + 修复编译错误"
```

- [ ] **Step 9: 输出最终验收报告**

```
## zhao-studio admin Ant Design 重写最终验收报告

### 验收清单
1. 无 @strapi/design-system 残留: ✅/❌
2. 无 @strapi/icons 残留: ✅/❌
3. npm run build 成功: ✅/❌
4. Strapi 启动无错误: ✅/❌
5. /admin/plugins/zhao-studio 可访问: ✅/❌
6. PluginLayout 左侧菜单显示: ✅/❌
7. 10 个页面可加载无白屏: ✅/❌ (X/10)

### Commit 列表
列出所有相关 commit hash

### 结论
重写完成 / 需后续修复
```

---

## Self-Review 结果

**1. Spec coverage 检查**：
- ✅ Spec 第 1.3 节范围内（11 pages + 16 components 重写）→ Task 2-10 覆盖
- ✅ Spec 第 3 节依赖与基础设施 → Task 1-2 实现
- ✅ Spec 第 5.1 节 Task 列表 11 项 → Task 1-11 一一对应
- ✅ Spec 第 7 节验收口径 → Task 11 Step 1-9 实现

**2. Placeholder 扫描**：
- 无 TBD/TODO/未实现段落
- 每个 Step 都含具体代码或命令
- 所有组件重写都提供了完整 antd 代码

**3. Type 一致性**：
- ✅ PluginIcon 在 Task 2 用 `export { PluginIcon }` + `export default`，index.ts import `{ PluginIcon }` 一致
- ✅ PluginLayout 在 Task 2 用 `export { PluginLayout }`，App.tsx import `{ PluginLayout }` 一致
- ✅ SourceConfig/TitleSelector/ContentPreview 的 props 接口在 Task 4 各步骤一致
- ✅ StatsChart 在 Task 7 定义 `ChartData { date, value }`，Task 8 StatsAdvancedPage/StatsProPage 复用一致
- ✅ AIAssistant 在 Task 10 定义 `Message { id, role, content }`，自洽

**4. 命令可执行性**：
- PowerShell 命令已使用 Windows 路径
- git 命令在 `e:\code\basic` 目录下执行
- npm 命令在插件目录或 basic 根目录执行

---

## 执行选择

Plan complete and saved to `docs/superpowers/plans/2026-06-30-zhao-studio-admin-antd-rewrite.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - 每个 Task 派 fresh subagent 执行，Task 间 review，快速迭代
2. **Inline Execution** - 当前会话批量执行，checkpoint 处 review

Which approach?
