# zhao-studio admin Ant Design 重写设计

- **日期**: 2026-06-30
- **类型**: admin 前端重写
- **状态**: 设计已确认，待实现
- **范围**: 将 `e:\code\basic\plugins\zhao-studio\admin\src` 从 `@strapi/design-system` 重写为 `antd v5` + `@ant-design/icons` + `@ant-design/pro-components` + `echarts-for-react`

## 1. 背景与目标

### 1.1 背景

zhao-studio 插件已 AS-IS 迁移至 `e:\code\basic\plugins\zhao-studio`（commit `8e6fe47` 及之前 7 个 commit），server 端验证通过（10 表创建、47 路由注册、4 权限 action）。但 admin 端仍使用源代码的 `@strapi/design-system v2` 技术栈，与项目其他插件（zhao-wealth）已完成的 Ant Design 重写模式不一致。

**zhao-wealth 先例**（参考 `e:\code\basic\plugins\zhao-wealth\admin\src\`）：
- `ConfigProvider prefixCls="zw"` 样式隔离
- `PluginLayout`（antd Layout + Menu）左侧导航
- `App.tsx` 用 ConfigProvider 包裹 PluginLayout + Routes
- `index.ts` 用本地 `PluginIcon` 组件替代 `@strapi/icons`
- 依赖：antd ^5.29.3 / @ant-design/icons ^5.6.1 / @ant-design/pro-components ^2.8.10 / echarts ^6.1.0 / echarts-for-react ^3.0.6

### 1.2 目标

采用**方案 B 渐进式重写**：
- 对齐 zhao-wealth 已完成的 Ant Design 重写模式
- 27 个 .tsx 文件从 `@strapi/design-system` → antd v5
- 保持 hooks（10 个）和 utils（8 个）不动
- 中间状态可运行（ConfigProvider 样式隔离避免冲突）

### 1.3 范围内

- 11 pages + 16 components 重写
- 新增 PluginLayout
- 重写 App.tsx、index.ts、PluginIcon.tsx
- package.json 依赖调整（加 antd 系列、移除 design-system peerDep）

### 1.4 范围外（YAGNI）

- 不重写 hooks（API 调用层与 UI 无关）
- 不重写 utils（纯工具函数）
- 不新增 i18n（zhao-studio 现状无多语言，保持）
- 不改 server 端（本次仅 admin 重写）
- 不新增 antd-charts（用 echarts-for-react，对齐 zhao-wealth）
- 不写单元测试（对齐 zhao-wealth 先例，启动验证为主）
- 不重写 tests（admin 测试不在本次范围）

## 2. 重写范围与模块划分

### 2.1 zhao-studio admin 现状

`e:\code\basic\plugins\zhao-studio\admin\src\`：
- 11 pages：HomePage / CollectPage / AIConfigPage / PublishPage / PlatformConfigPage / AccountConfigPage / AdSlotConfigPage / StatsBasicPage / StatsAdvancedPage / StatsProPage / App
- 16 components：AIAssistant / AIConfigForm / AccountForm / AdSlotForm / ContentPreview / Initializer / OverviewCard / PlatformForm / PluginIcon / PublishPanel / PublishRecordList / QualityScore / SourceConfig / StatsChart / StatsTable / TitleSelector
- 10 hooks（**无需重写**）
- 8 utils（**无需重写**）

### 2.2 模块划分（5 个模块）

| 模块 | pages | components | 复杂度 |
|---|---|---|---|
| **1. 基础设施** | App | PluginLayout(新增) + Initializer + PluginIcon + index.ts | 低 |
| **2. 仪表盘** | HomePage | OverviewCard | 低 |
| **3. 采集管理** | CollectPage | SourceConfig + TitleSelector + ContentPreview | 中 |
| **4. 发布管理** | PublishPage + PlatformConfigPage + AccountConfigPage + AdSlotConfigPage | PublishPanel + PublishRecordList + PlatformForm + AccountForm + AdSlotForm | 高 |
| **5. 统计与 AI** | StatsBasicPage + StatsAdvancedPage + StatsProPage + AIConfigPage | StatsChart + StatsTable + QualityScore + AIAssistant + AIConfigForm | 高 |

## 3. 依赖与基础设施

### 3.1 依赖安装

**新增到 `plugins/zhao-studio/package.json` 的 dependencies**（对齐 zhao-wealth）：

```json
"dependencies": {
  "@ant-design/icons": "^5.6.1",
  "@ant-design/pro-components": "^2.8.10",
  "antd": "^5.29.3",
  "echarts": "^6.1.0",
  "echarts-for-react": "^3.0.6"
}
```

**peerDependencies 移除 `@strapi/design-system` 和 `@strapi/icons`**（重写后不再使用）：

```json
"peerDependencies": {
  "@strapi/sdk-plugin": "^6.1.0",
  "@strapi/strapi": "^5.45.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.3",
  "styled-components": "^6.4.1"
}
```

注意：`styled-components` 保留（Strapi admin 外壳仍需），但内部组件不再用。

### 3.2 新增 PluginLayout

文件：`admin/src/components/Layout/PluginLayout.tsx`

```tsx
import { Layout, Menu } from 'antd';
import {
  HomeOutlined, CloudDownloadOutlined, SendOutlined,
  SettingOutlined, BarChartOutlined, RobotOutlined,
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

### 3.3 重写 App.tsx

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

关键决策：
- `prefixCls="zs"`（zhao-studio 缩写）避免与 Strapi admin 样式冲突
- 路由结构保持不变

### 3.4 重写 index.ts

```tsx
import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: { id: `${pluginId}.plugin.name`, defaultMessage: '内容工作室' },
      permissions: [{ action: 'plugin::zhao-studio.read', subject: null }],
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
    });
    app.registerPlugin({ id: pluginId, name: '内容工作室' });
  },
  bootstrap(app: any) {},
};
```

### 3.5 重写 PluginIcon.tsx

```tsx
import { RobotOutlined } from '@ant-design/icons';

const PluginIcon = () => <RobotOutlined />;

export default PluginIcon;
```

## 4. 组件重写映射表与关键模式

### 4.1 design-system → antd 映射表

| `@strapi/design-system` | `antd` | 备注 |
|---|---|---|
| `Box padding={8}` | `<div style={{ padding: 32 }}>` 或 antd `Space` | antd 无 Box，用原生 div |
| `Typography variant="alpha"` | `Typography.Title level={2}` | alpha≈h2 |
| `Typography variant="beta"` | `Typography.Title level={3}` | beta≈h3 |
| `Typography variant="delta"` | `Typography.Text` | 正文 |
| `Button variant="primary"` | `Button type="primary"` | |
| `Button variant="secondary"` | `Button` (默认) | |
| `Button variant="danger"` | `Button danger` | |
| `Flex gap={4}` | `Space size="middle"` 或 flex div | |
| `Badge` | `Badge` | antd 有同名 |
| `Modal` | `Modal` | antd 用 `open` 属性（非 `isShown`） |
| `Table` | `Table` | columns 结构不同，需重写 |
| `TextInput` | `Input` | |
| `TextareaInput` | `Input.TextArea` | |
| `NumberInput` | `InputNumber` | |
| `Select` | `Select` | |
| `DatePicker` | `DatePicker` | |
| `Loader` | `Spin` | |
| `EmptyStateLayout` | `Empty` | |
| `Card` | `Card` | |
| `Tabs` | `Tabs` | |
| `Tag` | `Tag` | |
| `Alert` | `Alert` | |
| `Switch` | `Switch` | |
| `Checkbox` | `Checkbox` | |
| `RadioGroup` | `Radio.Group` | |

### 4.2 表格重写模式（关键差异）

Strapi design-system Table 用 children 渲染行，antd Table 用 columns + dataSource：

```tsx
const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action', render: (_, record) => (
    <Space>
      <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
      <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
        <Button size="small" danger>删除</Button>
      </Popconfirm>
    </Space>
  )},
];

<Table columns={columns} dataSource={sources} rowKey="id" loading={loading} />
```

### 4.3 表单重写模式

```tsx
const [form] = Form.useForm();

<Form form={form} layout="vertical" onFinish={handleSave}>
  <Form.Item name="name" label="名称" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Form.Item name="url" label="URL" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Form.Item>
    <Button type="primary" htmlType="submit">保存</Button>
  </Form.Item>
</Form>
```

### 4.4 组件复杂度评估

| 组件 | 复杂度 | 主要工作 |
|---|---|---|
| PluginIcon/Initializer | 低 | 直接替换图标 |
| OverviewCard | 低 | Card + Typography |
| QualityScore | 低 | Tag + 数字染色 |
| StatsTable | 中 | Table 重写 |
| StatsChart | 中 | echarts-for-react 替换 |
| SourceConfig | 中 | Form + Modal |
| TitleSelector | 中 | Checkbox + List |
| ContentPreview | 中 | Card + Typography |
| PlatformForm/AccountForm/AdSlotForm | 中 | Form + Modal |
| PublishPanel | 中 | Tabs + Steps |
| PublishRecordList | 中 | Table + Tag |
| AIAssistant | 高 | 聊天 UI（消息列表 + 输入） |
| AIConfigForm | 高 | 动态表单（多 provider 配置） |
| AIConfigPage | 高 | 复杂布局 |

### 4.5 charts 替换模式

```tsx
import ReactECharts from 'echarts-for-react';

const StatsChart = ({ data, type = 'line' }: Props) => {
  const option = {
    xAxis: { type: 'category', data: data.map(d => d.date) },
    yAxis: { type: 'value' },
    series: [{ data: data.map(d => d.value), type, smooth: true }],
    tooltip: { trigger: 'axis' },
  };
  return <ReactECharts option={option} style={{ height: 300 }} />;
};
```

### 4.6 样式隔离策略

- **ConfigProvider prefixCls="zs"**：所有 antd 类名前缀变 `zs-*`，避免与 Strapi admin 的 `ant-*` 冲突
- **iconPrefixCls="zs-icon"**：图标类名前缀隔离
- **PluginLayout 独立 Sider**：左侧菜单完全由 antd Menu 控制
- **Content background: '#f5f5f5'**：内容区背景与 Strapi admin 区分

## 5. Task 分解与执行顺序

### 5.1 Task 列表（11 个 Task）

| Task | 内容 | 涉及文件 | 依赖 |
|---|---|---|---|
| **1. 依赖与配置** | package.json 补 antd 依赖、移除 design-system peerDep、安装 | package.json | 无 |
| **2. 基础设施** | PluginLayout(新增)、App.tsx、index.ts、PluginIcon、Initializer 重写 | 5 文件 | Task 1 |
| **3. 仪表盘模块** | HomePage + OverviewCard | 2 文件 | Task 2 |
| **4. 采集管理模块** | CollectPage + SourceConfig + TitleSelector + ContentPreview | 4 文件 | Task 2 |
| **5. 发布管理 - 主页面** | PublishPage + PublishPanel + PublishRecordList | 3 文件 | Task 2 |
| **6. 发布管理 - 配置页** | PlatformConfigPage/AccountConfigPage/AdSlotConfigPage + PlatformForm/AccountForm/AdSlotForm | 6 文件 | Task 2 |
| **7. 统计模块 - 基础** | StatsBasicPage + StatsTable + StatsChart | 3 文件 | Task 2 |
| **8. 统计模块 - 高级/专业** | StatsAdvancedPage + StatsProPage | 2 文件 | Task 7 |
| **9. AI 配置模块** | AIConfigPage + AIConfigForm | 2 文件 | Task 2 |
| **10. AI 助手组件** | AIAssistant | 1 文件 | Task 9 |
| **11. 启动验证与清理** | 全量启动验证、移除残留 design-system 导入、commit | - | Task 1-10 |

### 5.2 Task 间验证点

- **Task 1 后**：`npm install` 成功，无版本冲突
- **Task 2 后**：启动 Strapi，`/admin/plugins/zhao-studio` 显示空 PluginLayout（左侧菜单可见，内容区空）
- **Task 3 后**：HomePage 显示仪表盘卡片
- **Task 4 后**：CollectPage 完整可用（列表+表单+Modal）
- **Task 5 后**：PublishPage 完整可用
- **Task 6 后**：3 个配置页完整可用
- **Task 7 后**：StatsBasicPage 显示表格+图表
- **Task 8 后**：3 个统计页全部可用
- **Task 9 后**：AIConfigPage 表单可用
- **Task 10 后**：AIAssistant 聊天可用
- **Task 11 后**：全量验证通过，无 design-system 残留

### 5.3 执行策略

- **Subagent-Driven 模式**：每个 Task 派 fresh subagent 执行
- **Task 间 review**：检查关键文件改动与验证结果
- **每 Task 单独 commit**：便于回滚
- **允许并行**：Task 4/5/6/7/9 互相独立，可考虑并行派发（但为控制验证质量，建议串行）

## 6. 风险点与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| **antd 版本与 Strapi admin 冲突** | 样式污染、组件异常 | ConfigProvider `prefixCls="zs"` 隔离；Task 2 后立即验证 |
| **Table/Form 重写工作量大** | Task 4-6 可能超预期 | 映射表已明确，按模式执行；单 Task 失败不阻塞其他 |
| **hooks 与 antd Table dataSource 不兼容** | 数据格式需转换 | hooks 保持原样，在 page 层做数据适配 |
| **Modal 状态管理差异** | design-system Modal vs antd Modal | antd Modal 用 `open` 属性（非 `isShown`），状态提升到 page |
| **echarts 依赖体积** | 打包变大 | 接受（zhao-wealth 已有先例） |
| **残留 design-system 导入** | 编译错误 | Task 11 用 grep 扫描 `@strapi/design-system` 残留并清理 |

## 7. 验收口径

- **Task 2 完成后**：PluginLayout 可见、菜单可点击、路由可切换（空页面也可）
- **Task 10 完成后**：所有 11 pages 可访问无白屏
- **Task 11 完成后**：
  1. `grep -r "@strapi/design-system" admin/src` 无匹配
  2. `grep -r "@strapi/icons" admin/src` 无匹配
  3. `npm run develop` 启动无错误
  4. `/admin/plugins/zhao-studio` 全功能可用
  5. 5 个模块（仪表盘/采集/发布/统计/AI）手动触发一次操作确认

## 8. 后续阶段（不在本次范围）

- **i18n 多语言**：若后续需要多语言支持，参考 zhao-wealth 的 translations 目录结构
- **antd-charts**：若需更丰富的图表组件，可后续替换 echarts-for-react
- **admin 单元测试**：本次不写，后续可补 React Testing Library 测试
- **server 端优化**：本次仅 admin，server 端如有性能或功能问题另行处理
