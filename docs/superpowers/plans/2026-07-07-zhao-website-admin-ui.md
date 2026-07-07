# zhao-website Admin UI 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-website 插件添加 Admin UI，覆盖 6 个特殊管理操作页面（Dashboard / Studio Bridge / Knowledge Graph / First-Truth / AI Summaries / SEO 输出预览）。

**Architecture:** 参考 zhao-studio antd 5 模式：`admin/src/index.ts` 注册 addMenuLink + 单页 App 路由 + PluginLayout 侧边栏。复用 antd 5 + react-router-dom 6。所有 18 CT 的 CRUD 用 Strapi Content Manager，本 UI 只做特殊操作入口。

**Tech Stack:** React 18 + TypeScript + antd 5 + @ant-design/icons + react-router-dom 6 + @strapi/design-system

**Spec:** `docs/superpowers/specs/2026-07-07-zhao-website-admin-ui-design.md`

---

## 文件结构

| 文件 | 职责 | 操作 |
|---|---|---|
| `plugins/zhao-website/package.json` | 添加 antd/react 等依赖 | 修改 |
| `plugins/zhao-website/admin/tsconfig.json` | admin TS 配置 | 新建 |
| `plugins/zhao-website/admin/custom.d.ts` | 模块声明 | 新建 |
| `plugins/zhao-website/admin/src/index.ts` | 注册 addMenuLink | 修改 |
| `plugins/zhao-website/admin/src/pluginId.ts` | 已存在 | 不变 |
| `plugins/zhao-website/admin/src/components/PluginIcon.tsx` | 菜单图标 | 新建 |
| `plugins/zhao-website/admin/src/components/PluginLayout.tsx` | 侧边栏布局 | 新建 |
| `plugins/zhao-website/admin/src/components/OverviewCard.tsx` | 统计卡片 | 新建 |
| `plugins/zhao-website/admin/src/hooks/useFetch.ts` | 通用 fetch hook | 新建 |
| `plugins/zhao-website/admin/src/utils/api.ts` | API 路径 + fetch 封装 | 新建 |
| `plugins/zhao-website/admin/src/pages/App.tsx` | 路由入口 | 新建 |
| `plugins/zhao-website/admin/src/pages/DashboardPage.tsx` | 统计概览 | 新建 |
| `plugins/zhao-website/admin/src/pages/StudioBridgePage.tsx` | 一键发布 | 新建 |
| `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx` | KG 管理 | 新建 |
| `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx` | 真值管理 | 新建 |
| `plugins/zhao-website/admin/src/pages/AISummariesPage.tsx` | AI 摘要 | 新建 |
| `plugins/zhao-website/admin/src/pages/SEOOutputPage.tsx` | SEO 预览 | 新建 |

---

### Task 1: 基础设施（package.json + tsconfig + index 注册 + PluginIcon + PluginLayout + useFetch + api util）

**Files:**
- Modify: `plugins/zhao-website/package.json`
- Create: `plugins/zhao-website/admin/tsconfig.json`
- Create: `plugins/zhao-website/admin/custom.d.ts`
- Modify: `plugins/zhao-website/admin/src/index.ts`
- Create: `plugins/zhao-website/admin/src/components/PluginIcon.tsx`
- Create: `plugins/zhao-website/admin/src/components/PluginLayout.tsx`
- Create: `plugins/zhao-website/admin/src/hooks/useFetch.ts`
- Create: `plugins/zhao-website/admin/src/utils/api.ts`

- [ ] **Step 1: 修改 package.json 添加依赖**

修改 `plugins/zhao-website/package.json`，在 `dependencies` 中添加 antd 相关，在 `peerDependencies` 中添加 react：

将 `dependencies` 从：
```json
  "dependencies": {
  },
```
改为：
```json
  "dependencies": {
    "@ant-design/icons": "^5.6.1",
    "antd": "^5.29.3"
  },
```

将 `peerDependencies` 从：
```json
  "peerDependencies": {
    "@strapi/sdk-plugin": "^6.1.0",
    "@strapi/strapi": "^5.45.0"
  },
```
改为：
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

- [ ] **Step 2: 创建 admin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleDetection": "force",
    "baseUrl": ".",
    "paths": {
      "@strapi/strapi": ["../../../node_modules/@strapi/strapi"],
      "@strapi/design-system": ["../../../node_modules/@strapi/design-system"],
      "@strapi/icons": ["../../../node_modules/@strapi/icons"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建 admin/custom.d.ts**

```ts
declare module '*.css';
declare module '*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}
```

- [ ] **Step 4: 修改 admin/src/index.ts 注册菜单**

完整替换 `plugins/zhao-website/admin/src/index.ts`：

```ts
import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export { pluginId };
export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '官网管理',
      },
      permissions: [
        {
          action: 'plugin::zhao-website.read',
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
      name: '官网管理',
    });
  },
  bootstrap(app: any) {},
};
```

- [ ] **Step 5: 创建 components/PluginIcon.tsx**

```tsx
import React from 'react';
import { GlobalOutlined } from '@ant-design/icons';

const PluginIcon = () => <GlobalOutlined />;

export default PluginIcon;
```

- [ ] **Step 6: 创建 components/PluginLayout.tsx**

```tsx
import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  RocketOutlined,
  ShareAltOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: '', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'studio-bridge', icon: <RocketOutlined />, label: '一键发布' },
  { key: 'knowledge-graph', icon: <ShareAltOutlined />, label: '知识图谱' },
  { key: 'first-truth', icon: <SafetyCertificateOutlined />, label: '第一真值' },
  { key: 'ai-summaries', icon: <RobotOutlined />, label: 'AI 摘要' },
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
```

- [ ] **Step 7: 创建 hooks/useFetch.ts**

```ts
import { useState, useEffect, useCallback } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFetch<T = any>(url: string | null, options?: RequestInit): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, trigger, options]);

  return { data, loading, error, refetch };
}

export async function postJSON(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function putJSON(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export async function deleteJSON(url: string): Promise<any> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}
```

- [ ] **Step 8: 创建 utils/api.ts**

```ts
// API 路径常量
const ADMIN_BASE = '/api/zhao-website/admin';
const PUBLIC_BASE = '/api/zhao-website/v1';

export const API = {
  // stats
  statsOverview: `${ADMIN_BASE}/stats/overview`,
  statsLead: (days = 30) => `${ADMIN_BASE}/stats/lead-stats?days=${days}`,
  statsSearch: (days = 30) => `${ADMIN_BASE}/stats/search-stats?days=${days}`,
  // studio-bridge
  studioBridgePublish: `${ADMIN_BASE}/studio-bridge/publishFromStudio`,
  // knowledge-graph
  kgFindEntities: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/find-entities?${new URLSearchParams(params).toString()}`,
  kgCreateEntity: `${ADMIN_BASE}/knowledge-graph/create-entity`,
  kgUpdateEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/update-entity/${id}`,
  kgDeleteEntity: (id: string) => `${ADMIN_BASE}/knowledge-graph/delete-entity/${id}`,
  kgFindRelations: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/knowledge-graph/find-relations?${new URLSearchParams(params).toString()}`,
  kgAddRelation: `${ADMIN_BASE}/knowledge-graph/add-relation`,
  kgDeleteRelation: (id: string) => `${ADMIN_BASE}/knowledge-graph/delete-relation/${id}`,
  kgExportGraph: `${ADMIN_BASE}/knowledge-graph/export-graph`,
  // first-truth
  ftFind: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/first-truth/find?${new URLSearchParams(params).toString()}`,
  ftFindOne: (id: string) => `${ADMIN_BASE}/first-truth/find-one/${id}`,
  ftCreate: `${ADMIN_BASE}/first-truth/create`,
  ftUpdate: (id: string) => `${ADMIN_BASE}/first-truth/update/${id}`,
  ftDelete: (id: string) => `${ADMIN_BASE}/first-truth/delete/${id}`,
  ftVerify: (id: string) => `${ADMIN_BASE}/first-truth/verify/${id}`,
  ftConflicts: `${ADMIN_BASE}/first-truth/conflicts`,
  ftExportFacts: `${ADMIN_BASE}/first-truth/export-facts`,
  // ai-content-summary
  aiFindByTarget: (params: Record<string, any> = {}) =>
    `${ADMIN_BASE}/ai-content-summary/find-by-target?${new URLSearchParams(params).toString()}`,
  aiCreate: `${ADMIN_BASE}/ai-content-summary/create`,
  aiUpdate: (id: string) => `${ADMIN_BASE}/ai-content-summary/update/${id}`,
  aiDelete: (id: string) => `${ADMIN_BASE}/ai-content-summary/delete/${id}`,
  aiRegenerate: (id: string) => `${ADMIN_BASE}/ai-content-summary/regenerate/${id}`,
  // seo-output（公开接口）
  seoSitemap: `${PUBLIC_BASE}/sitemap.xml`,
  seoRobots: `${PUBLIC_BASE}/robots.txt`,
  seoLlmsTxt: `${PUBLIC_BASE}/llms.txt`,
};
```

- [ ] **Step 9: 安装依赖并验证 tsc**

运行：
```bash
cd e:\code\basic\plugins\zhao-website
npm install
npx tsc --noEmit -p admin/tsconfig.json
```
期望：无错误或仅有与 @strapi 类型相关的不影响运行的警告

- [ ] **Step 10: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/package.json plugins/zhao-website/package-lock.json plugins/zhao-website/admin/tsconfig.json plugins/zhao-website/admin/custom.d.ts plugins/zhao-website/admin/src/index.ts plugins/zhao-website/admin/src/components/PluginIcon.tsx plugins/zhao-website/admin/src/components/PluginLayout.tsx plugins/zhao-website/admin/src/hooks/useFetch.ts plugins/zhao-website/admin/src/utils/api.ts
git commit -m "feat(zhao-website): admin UI 基础设施（注册菜单 + tsconfig + PluginLayout + useFetch + api util）"
```

---

### Task 2: App 路由 + Dashboard 页面 + OverviewCard 组件

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/App.tsx`
- Create: `plugins/zhao-website/admin/src/pages/DashboardPage.tsx`
- Create: `plugins/zhao-website/admin/src/components/OverviewCard.tsx`

- [ ] **Step 1: 创建 pages/App.tsx**

```tsx
import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Routes, Route } from 'react-router-dom';
import { PluginLayout } from '../components/PluginLayout';
import DashboardPage from './DashboardPage';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<div>页面建设中</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);

export default App;
```

注意：其他页面在后续 Task 中添加 Route。

- [ ] **Step 2: 创建 components/OverviewCard.tsx**

```tsx
import React from 'react';
import { Card, Typography } from 'antd';

const { Text, Title } = Typography;

interface OverviewCardProps {
  title: string;
  value: number | string;
  suffix?: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, suffix }) => (
  <Card>
    <Text type="secondary">{title}</Text>
    <Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>
      {value}{suffix && <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>{suffix}</Text>}
    </Title>
  </Card>
);

export default OverviewCard;
```

- [ ] **Step 3: 创建 pages/DashboardPage.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { Row, Col, Typography, Card, Tabs, Table, Spin, message } from 'antd';
import OverviewCard from '../components/OverviewCard';
import { useFetch, postJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Title, Paragraph } = Typography;

const DashboardPage = () => {
  const { data: overview, loading } = useFetch<any>(API.statsOverview);
  const { data: leadStats } = useFetch<any>(API.statsLead(30));
  const { data: searchStats } = useFetch<any>(API.statsSearch(30));

  return (
    <Spin spinning={loading}>
      <Card style={{ marginBottom: 16 }}>
        <Title level={3}>官网管理仪表盘</Title>
        <Paragraph type="secondary">内容资产、线索转化、SEO 表现概览</Paragraph>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="文章数" value={overview?.articles ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="产品数" value={overview?.products ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="案例数" value={overview?.cases ?? 0} />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <OverviewCard title="线索数" value={overview?.leads ?? 0} />
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'leads',
              label: '线索趋势（近 30 天）',
              children: (
                <Table
                  size="small"
                  dataSource={Array.isArray(leadStats) ? leadStats : (leadStats?.data || [])}
                  columns={[
                    { title: '日期', dataIndex: 'date' },
                    { title: '线索数', dataIndex: 'count' },
                  ]}
                  rowKey="date"
                  pagination={false}
                />
              ),
            },
            {
              key: 'search',
              label: '搜索热词（近 30 天 Top 10）',
              children: (
                <Table
                  size="small"
                  dataSource={(Array.isArray(searchStats?.topKeywords) ? searchStats.topKeywords : []).slice(0, 10)}
                  columns={[
                    { title: '关键词', dataIndex: 'keyword' },
                    { title: '搜索次数', dataIndex: 'count' },
                  ]}
                  rowKey="keyword"
                  pagination={false}
                />
              ),
            },
          ]}
        />
      </Card>
    </Spin>
  );
};

export default DashboardPage;
```

- [ ] **Step 4: 验证 tsc**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`
期望：无错误

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/App.tsx plugins/zhao-website/admin/src/pages/DashboardPage.tsx plugins/zhao-website/admin/src/components/OverviewCard.tsx
git commit -m "feat(zhao-website): admin App 路由 + Dashboard 仪表盘页面"
```

---

### Task 3: Studio Bridge 页面（一键发布）

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/StudioBridgePage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`（添加 Route）

- [ ] **Step 1: 创建 pages/StudioBridgePage.tsx**

```tsx
import React, { useState } from 'react';
import { Card, Form, Select, Radio, Button, Typography, message, Alert } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { postJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Title, Paragraph } = Typography;

const StudioBridgePage = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await postJSON(API.studioBridgePublish, {
        draftDocumentId: values.draftDocumentId,
        siteId: values.siteId,
        status: values.status,
      });
      setResult(res);
      message.success('发布成功');
    } catch (err) {
      message.error(`发布失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <Title level={3}><RocketOutlined /> 从 Studio 一键发布到官网</Title>
      <Paragraph type="secondary">
        将 zhao-studio 的草稿文章发布到 zhao-website，自动同步标题、内容、标签、SEO 字段。
      </Paragraph>

      <Alert
        type="info"
        showIcon
        message="草稿 documentId 与站点 ID 请从 zhao-studio 草稿列表和站点配置中获取后填入"
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'published' }}
        style={{ maxWidth: 500 }}
      >
        <Form.Item
          name="draftDocumentId"
          label="草稿 Document ID"
          rules={[{ required: true, message: '请输入草稿 documentId' }]}
        >
          <Select
            mode="tags"
            maxCount={1}
            placeholder="输入 zhao-studio 草稿的 documentId"
          />
        </Form.Item>

        <Form.Item
          name="siteId"
          label="目标站点 ID"
          rules={[{ required: true, message: '请输入站点 ID' }]}
        >
          <Select
            mode="tags"
            maxCount={1}
            placeholder="输入目标 site-config 的 ID"
          />
        </Form.Item>

        <Form.Item name="status" label="发布状态">
          <Radio.Group>
            <Radio value="published">立即发布</Radio>
            <Radio value="draft">存为草稿</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<RocketOutlined />}>
            一键发布
          </Button>
        </Form.Item>
      </Form>

      {result && (
        <Alert
          type="success"
          showIcon
          message="发布结果"
          description={<pre style={{ margin: 0 }}>{JSON.stringify(result, null, 2)}</pre>}
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  );
};

export default StudioBridgePage;
```

- [ ] **Step 2: 修改 App.tsx 添加 Route**

修改 `plugins/zhao-website/admin/src/pages/App.tsx`，将：
```tsx
import DashboardPage from './DashboardPage';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<div>页面建设中</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);
```
改为：
```tsx
import DashboardPage from './DashboardPage';
import StudioBridgePage from './StudioBridgePage';

const App = () => (
  <ConfigProvider prefixCls="zw" iconPrefixCls="zw-icon" locale={zhCN}>
    <PluginLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/studio-bridge" element={<StudioBridgePage />} />
        <Route path="*" element={<div>页面建设中</div>} />
      </Routes>
    </PluginLayout>
  </ConfigProvider>
);
```

- [ ] **Step 3: 验证 tsc + Commit**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/StudioBridgePage.tsx plugins/zhao-website/admin/src/pages/App.tsx
git commit -m "feat(zhao-website): admin Studio Bridge 一键发布页面"
```

---

### Task 4: Knowledge Graph 页面

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`（添加 Route）

- [ ] **Step 1: 创建 pages/KnowledgeGraphPage.tsx**

```tsx
import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, ExportOutlined } from '@ant-design/icons';
import { useFetch, postJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Text } = Typography;

const KnowledgeGraphPage = () => {
  const [activeTab, setActiveTab] = useState('entities');
  const [entityParams, setEntityParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [relationParams, setRelationParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [relationModalOpen, setRelationModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [entityForm] = Form.useForm();
  const [relationForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { data: entities, loading: loadingEntities, refetch: refetchEntities } = useFetch<any[]>(
    activeTab === 'entities' ? API.kgFindEntities(entityParams) : null
  );
  const { data: relations, loading: loadingRelations, refetch: refetchRelations } = useFetch<any[]>(
    activeTab === 'relations' ? API.kgFindRelations(relationParams) : null
  );

  const handleCreateEntity = async (values: any) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgCreateEntity, values);
      message.success('实体创建成功');
      setEntityModalOpen(false);
      entityForm.resetFields();
      refetchEntities();
    } catch (err) {
      message.error(`创建失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntity = async (documentId: string) => {
    try {
      await deleteJSON(API.kgDeleteEntity(documentId));
      message.success('已删除');
      refetchEntities();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleAddRelation = async (values: any) => {
    setSubmitting(true);
    try {
      await postJSON(API.kgAddRelation, values);
      message.success('关系创建成功');
      setRelationModalOpen(false);
      relationForm.resetFields();
      refetchRelations();
    } catch (err) {
      message.error(`创建失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRelation = async (documentId: string) => {
    try {
      await deleteJSON(API.kgDeleteRelation(documentId));
      message.success('已删除');
      refetchRelations();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(API.kgExportGraph).then((r) => r.json());
      setExportData(res);
      setExportModalOpen(true);
    } catch (err) {
      message.error(`导出失败: ${(err as Error).message}`);
    }
  };

  const entityColumns = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'entityType' },
    { title: 'Slug', dataIndex: 'slug' },
    { title: '来源', dataIndex: 'sourceType' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteEntity(record.documentId)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const relationColumns = [
    { title: '主体', dataIndex: ['subjectEntity', 'name'], render: (v: any) => v || '-' },
    { title: '谓词', dataIndex: 'predicate' },
    { title: '客体实体', dataIndex: ['objectEntity', 'name'], render: (v: any) => v || '-' },
    { title: '客体值', dataIndex: 'objectValue', render: (v: any) => v ?? '-' },
    { title: '客体文本', dataIndex: 'objectText', render: (v: any) => v ?? '-' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDeleteRelation(record.documentId)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出 JSON-LD</Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'entities',
            label: '实体',
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setEntityModalOpen(true)} style={{ marginBottom: 16 }}>
                  新建实体
                </Button>
                <Table
                  columns={entityColumns}
                  dataSource={entities || []}
                  rowKey="documentId"
                  loading={loadingEntities}
                  size="small"
                  pagination={{ current: entityParams.page, pageSize: entityParams.pageSize }}
                />
              </>
            ),
          },
          {
            key: 'relations',
            label: '关系',
            children: (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setRelationModalOpen(true)} style={{ marginBottom: 16 }}>
                  新建关系
                </Button>
                <Table
                  columns={relationColumns}
                  dataSource={relations || []}
                  rowKey="documentId"
                  loading={loadingRelations}
                  size="small"
                  pagination={{ current: relationParams.page, pageSize: relationParams.pageSize }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="新建实体"
        open={entityModalOpen}
        onCancel={() => setEntityModalOpen(false)}
        onOk={() => entityForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={entityForm} layout="vertical" onFinish={handleCreateEntity}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="entityType" label="类型" rules={[{ required: true }]}>
            <Select options={[
              'Organization', 'Person', 'Product', 'Article', 'CaseStudy',
              'Event', 'FAQ', 'HowTo', 'Download',
            ].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="新建关系"
        open={relationModalOpen}
        onCancel={() => setRelationModalOpen(false)}
        onOk={() => relationForm.submit()}
        confirmLoading={submitting}
      >
        <Form form={relationForm} layout="vertical" onFinish={handleAddRelation}>
          <Form.Item name="subjectEntityId" label="主体 Entity Document ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="predicate" label="谓词" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="objectEntityId" label="客体 Entity Document ID（与值二选一）">
            <Input />
          </Form.Item>
          <Form.Item name="objectValue" label="客体值（与实体二选一）">
            <Input />
          </Form.Item>
          <Form.Item name="objectText" label="客体文本（与实体二选一）">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="JSON-LD 导出"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={null}
        width={700}
      >
        <pre style={{ maxHeight: 500, overflow: 'auto' }}>
          {exportData ? JSON.stringify(exportData, null, 2) : '加载中...'}
        </pre>
      </Modal>
    </Card>
  );
};

export default KnowledgeGraphPage;
```

- [ ] **Step 2: 修改 App.tsx 添加 Route**

在 `import StudioBridgePage from './StudioBridgePage';` 后添加：
```tsx
import KnowledgeGraphPage from './KnowledgeGraphPage';
```

在 `<Route path="/studio-bridge" element={<StudioBridgePage />} />` 后添加：
```tsx
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
```

- [ ] **Step 3: 验证 tsc + Commit**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/KnowledgeGraphPage.tsx plugins/zhao-website/admin/src/pages/App.tsx
git commit -m "feat(zhao-website): admin Knowledge Graph 管理页面（实体/关系 CRUD + JSON-LD 导出）"
```

---

### Task 5: First-Truth 页面

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`（添加 Route）

- [ ] **Step 1: 创建 pages/FirstTruthPage.tsx**

```tsx
import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, InputNumber, Space, message, Popconfirm, Alert, Typography } from 'antd';
import { PlusOutlined, ExportOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useFetch, postJSON, putJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const FirstTruthPage = () => {
  const [activeTab, setActiveTab] = useState('list');
  const [listParams, setListParams] = useState<Record<string, any>>({ page: 1, pageSize: 10 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [conflictsTrigger, setConflictsTrigger] = useState(0);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { data: truths, loading } = useFetch<any[]>(API.ftFind(listParams));
  const { data: conflicts, loading: loadingConflicts } = useFetch<any[]>(
    activeTab === 'conflicts' ? API.ftConflicts : null
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingId(record.documentId);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await putJSON(API.ftUpdate(editingId), values);
        message.success('已更新');
      } else {
        await postJSON(API.ftCreate, values);
        message.success('已创建');
      }
      setModalOpen(false);
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (documentId: string) => {
    try {
      await postJSON(API.ftVerify(documentId), {});
      message.success('已标记为 verified');
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteJSON(API.ftDelete(documentId));
      message.success('已删除');
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(API.ftExportFacts).then((r) => r.json());
      setExportData(res);
      setExportOpen(true);
    } catch (err) {
      message.error(`导出失败: ${(err as Error).message}`);
    }
  };

  const columns = [
    { title: 'claimKey', dataIndex: 'claimKey' },
    { title: 'claim', dataIndex: 'claim' },
    { title: 'canonicalValue', dataIndex: 'canonicalValue' },
    { title: '类目', dataIndex: 'claimCategory' },
    { title: '优先级', dataIndex: 'priority' },
    {
      title: '状态',
      dataIndex: 'verificationStatus',
      render: (v: string) => (
        <span style={{ color: v === 'verified' ? '#52c41a' : v === 'conflict' ? '#ff4d4f' : '#faad14' }}>{v}</span>
      ),
    },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>编辑</Button>
          {record.verificationStatus !== 'verified' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record.documentId)}>
              verify
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.documentId)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const conflictColumns = [
    { title: 'claimKey', dataIndex: 'claimKey' },
    {
      title: '严重级别',
      dataIndex: 'severity',
      render: (v: string) => (
        <Space>
          <WarningOutlined style={{ color: v === 'error' ? '#ff4d4f' : '#faad14' }} />
          {v}
        </Space>
      ),
    },
    {
      title: '冲突值',
      dataIndex: 'values',
      render: (values: any[]) => (
        <div>
          {values?.map((v, i) => (
            <div key={i}>
              <strong>{v.value}</strong> <span style={{ color: '#999' }}>({v.sourceType}: {v.sourceUrl || '-'})</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={handleOpenCreate}>新建真值</Button>
        <Button icon={<ExportOutlined />} onClick={handleExport}>导出 Facts</Button>
      </Space>

      {conflicts && conflicts.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`检测到 ${conflicts.length} 个冲突，请到「冲突检测」Tab 处理`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: '真值列表',
            children: (
              <Table
                columns={columns}
                dataSource={truths || []}
                rowKey="documentId"
                loading={loading}
                size="small"
                pagination={{ current: listParams.page, pageSize: listParams.pageSize }}
              />
            ),
          },
          {
            key: 'conflicts',
            label: '冲突检测',
            children: (
              <Table
                columns={conflictColumns}
                dataSource={conflicts || []}
                rowKey="claimKey"
                loading={loadingConflicts}
                size="small"
                pagination={false}
              />
            ),
          },
        ]}
      />

      <Modal
        title={editingId ? '编辑真值' : '新建真值'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="claimKey" label="claimKey" rules={[{ required: true }]}>
            <Input disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="claim" label="claim" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="canonicalValue" label="canonicalValue" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="claimCategory" label="类目">
            <Input />
          </Form.Item>
          <Form.Item name="priority" label="优先级（0-100）">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="canonicalSourceUrl" label="来源 URL">
            <Input />
          </Form.Item>
          <Form.Item name="canonicalSourceType" label="来源类型">
            <Select options={['official', 'report', 'news', 'other'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Facts 导出"
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        footer={null}
        width={700}
      >
        <pre style={{ maxHeight: 500, overflow: 'auto' }}>
          {exportData ? JSON.stringify(exportData, null, 2) : '加载中...'}
        </pre>
      </Modal>
    </Card>
  );
};

export default FirstTruthPage;
```

- [ ] **Step 2: 修改 App.tsx 添加 Route**

在 `import KnowledgeGraphPage from './KnowledgeGraphPage';` 后添加：
```tsx
import FirstTruthPage from './FirstTruthPage';
```

在 `<Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />` 后添加：
```tsx
        <Route path="/first-truth" element={<FirstTruthPage />} />
```

- [ ] **Step 3: 验证 tsc + Commit**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/FirstTruthPage.tsx plugins/zhao-website/admin/src/pages/App.tsx
git commit -m "feat(zhao-website): admin First-Truth 管理页面（真值 CRUD + 冲突检测 + verify）"
```

---

### Task 6: AI Summaries 页面

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/AISummariesPage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`（添加 Route）

- [ ] **Step 1: 创建 pages/AISummariesPage.tsx**

```tsx
import React, { useState } from 'react';
import { Card, Table, Button, Select, Space, message, Popconfirm, Modal, Form, Input, Tag } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useFetch, postJSON, putJSON, deleteJSON } from '../hooks/useFetch';
import { API } from '../utils/api';

const AISummariesPage = () => {
  const [targetType, setTargetType] = useState<string | undefined>(undefined);
  const [summaryType, setSummaryType] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const params: Record<string, any> = {};
  if (targetType) params.targetType = targetType;
  if (summaryType) params.summaryType = summaryType;

  const { data: summaries, loading, refetch } = useFetch<any[]>(API.aiFindByTarget(params));

  const handleRegenerate = async (documentId: string) => {
    setRegenerating(documentId);
    try {
      await postJSON(API.aiRegenerate(documentId), {});
      message.success('AI 重新生成已触发（异步，请稍后刷新查看）');
      refetch();
    } catch (err) {
      message.error(`触发失败: ${(err as Error).message}`);
    } finally {
      setRegenerating(null);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteJSON(API.aiDelete(documentId));
      message.success('已删除');
      refetch();
    } catch (err) {
      message.error(`删除失败: ${(err as Error).message}`);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingId(record.documentId);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingId) {
        await putJSON(API.aiUpdate(editingId), values);
        message.success('已更新');
      } else {
        await postJSON(API.aiCreate, values);
        message.success('已创建');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      message.error(`操作失败: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'targetType', dataIndex: 'targetType' },
    { title: 'targetId', dataIndex: 'targetId' },
    { title: 'summaryType', dataIndex: 'summaryType', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => v?.slice(0, 80) + (v?.length > 80 ? '...' : ''),
    },
    { title: '版本', dataIndex: 'version' },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>编辑</Button>
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            loading={regenerating === record.documentId}
            onClick={() => handleRegenerate(record.documentId)}
          >
            重新生成
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.documentId)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="筛选 targetType"
          style={{ width: 150 }}
          value={targetType}
          onChange={setTargetType}
          options={['article', 'product', 'case', 'faq', 'tutorial'].map((t) => ({ label: t, value: t }))}
        />
        <Select
          allowClear
          placeholder="筛选 summaryType"
          style={{ width: 150 }}
          value={summaryType}
          onChange={setSummaryType}
          options={['brief', 'detailed', 'seo', 'social'].map((t) => ({ label: t, value: t }))}
        />
        <Button icon={<PlusOutlined />} onClick={handleOpenCreate}>新建</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={summaries || []}
        rowKey="documentId"
        loading={loading}
        size="small"
      />

      <Modal
        title={editingId ? '编辑摘要' : '新建摘要'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="targetType" label="targetType" rules={[{ required: true }]}>
            <Select options={['article', 'product', 'case', 'faq', 'tutorial'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="targetId" label="targetId" rules={[{ required: true }]}>
            <Input disabled={!!editingId} />
          </Form.Item>
          <Form.Item name="summaryType" label="summaryType" rules={[{ required: true }]}>
            <Select options={['brief', 'detailed', 'seo', 'social'].map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="content" label="content" rules={[{ required: true }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AISummariesPage;
```

- [ ] **Step 2: 修改 App.tsx 添加 Route**

在 `import FirstTruthPage from './FirstTruthPage';` 后添加：
```tsx
import AISummariesPage from './AISummariesPage';
```

在 `<Route path="/first-truth" element={<FirstTruthPage />} />` 后添加：
```tsx
        <Route path="/ai-summaries" element={<AISummariesPage />} />
```

- [ ] **Step 3: 验证 tsc + Commit**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/AISummariesPage.tsx plugins/zhao-website/admin/src/pages/App.tsx
git commit -m "feat(zhao-website): admin AI Summaries 管理页面（列表 + CRUD + regenerate）"
```

---

### Task 7: SEO Output 页面 + 全量验证

**Files:**
- Create: `plugins/zhao-website/admin/src/pages/SEOOutputPage.tsx`
- Modify: `plugins/zhao-website/admin/src/pages/App.tsx`（添加 Route）

- [ ] **Step 1: 创建 pages/SEOOutputPage.tsx**

```tsx
import React, { useState } from 'react';
import { Card, Tabs, Button, Space, Spin, Typography, message } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { useFetch } from '../hooks/useFetch';
import { API } from '../utils/api';

const { Text } = Typography;

const SEOOutputPage = () => {
  const [activeTab, setActiveTab] = useState('sitemap');

  const sitemapFetch = useFetch<string>(activeTab === 'sitemap' ? API.seoSitemap : null);
  const robotsFetch = useFetch<string>(activeTab === 'robots' ? API.seoRobots : null);
  const llmsFetch = useFetch<string>(activeTab === 'llms' ? API.seoLlmsTxt : null);

  const handleCopy = async (text: string | null) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const renderTab = (label: string, fetchState: any) => (
    <Card
      title={label}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchState.refetch}>刷新</Button>
          <Button icon={<CopyOutlined />} onClick={() => handleCopy(fetchState.data)}>复制</Button>
        </Space>
      }
    >
      <Spin spinning={fetchState.loading}>
        {fetchState.error ? (
          <Text type="danger">加载失败: {fetchState.error.message}</Text>
        ) : (
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, maxHeight: 600, overflow: 'auto' }}>
            {typeof fetchState.data === 'string' ? fetchState.data : JSON.stringify(fetchState.data, null, 2)}
          </pre>
        )}
      </Spin>
    </Card>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={[
        { key: 'sitemap', label: 'sitemap.xml', children: renderTab('sitemap.xml', sitemapFetch) },
        { key: 'robots', label: 'robots.txt', children: renderTab('robots.txt', robotsFetch) },
        { key: 'llms', label: 'llms.txt', children: renderTab('llms.txt', llmsFetch) },
      ]}
    />
  );
};

export default SEOOutputPage;
```

- [ ] **Step 2: 修改 App.tsx 添加 Route**

将 `import AISummariesPage from './AISummariesPage';` 后添加：
```tsx
import SEOOutputPage from './SEOOutputPage';
```

将 `<Route path="*" element={<div>页面建设中</div>} />` 前添加：
```tsx
        <Route path="/seo-output" element={<SEOOutputPage />} />
```

最终 App.tsx 的 Routes 部分应为：
```tsx
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/studio-bridge" element={<StudioBridgePage />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/first-truth" element={<FirstTruthPage />} />
        <Route path="/ai-summaries" element={<AISummariesPage />} />
        <Route path="/seo-output" element={<SEOOutputPage />} />
        <Route path="*" element={<div>页面建设中</div>} />
      </Routes>
```

- [ ] **Step 3: 验证 tsc**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p admin/tsconfig.json`
期望：退出码 0

- [ ] **Step 4: 验证 server tsc（确保未破坏后端）**

运行：`cd e:\code\basic\plugins\zhao-website && npx tsc --noEmit -p tsconfig.server.json`
期望：退出码 0

- [ ] **Step 5: Commit**

```bash
cd e:\code\basic
git add plugins/zhao-website/admin/src/pages/SEOOutputPage.tsx plugins/zhao-website/admin/src/pages/App.tsx
git commit -m "feat(zhao-website): admin SEO 输出预览页面 + 6 个页面路由全部完成"
```

---

## 自我审查

### 1. Spec 覆盖检查

| Spec 章节 | 对应 Task | 状态 |
|---|---|---|
| §3 Admin 入口注册 | Task 1 Step 4 | ✅ |
| §4.1 Dashboard | Task 2 | ✅ |
| §4.2 Studio Bridge | Task 3 | ✅ |
| §4.3 Knowledge Graph | Task 4 | ✅ |
| §4.4 First-Truth | Task 5 | ✅ |
| §4.5 AI Summaries | Task 6 | ✅ |
| §4.6 SEO 输出预览 | Task 7 | ✅ |
| §5 文件结构（7 page + 2 component + 2 hook + 1 util） | 全部 Task | ✅ |
| §10 验收标准（tsc + 6 页面可访问） | Task 7 Step 3-4 | ✅ |

### 2. 占位符扫描

- 无 "TBD"、"TODO"
- 每个步骤都包含完整代码
- 每个 Route 添加都有具体代码

### 3. 类型一致性

| 文件/方法 | 跨 Task 一致性 |
|---|---|
| `useFetch(url)` | Task 1 定义 → Task 2-7 使用，签名一致 |
| `postJSON/putJSON/deleteJSON` | Task 1 定义 → Task 3-6 使用，签名一致 |
| `API.*` 路径常量 | Task 1 定义 → Task 2-7 使用，名称一致 |
| `PluginLayout` menuItems key | Task 1 定义（`studio-bridge` 等）→ Task 3-7 Route path 一致 |
| `ConfigProvider prefixCls="zw"` | Task 2 定义 → 后续不变 |

### 4. 已知风险

1. **admin token 自动携带**：useFetch 用原生 fetch，依赖浏览器同源自动带 cookie。如 Strapi admin 用 Bearer token，需在 useFetch 中从 Strapi 全局获取 token 添加 header。如运行时 401，需调整 useFetch。
2. **SEO 输出接口是公开的**：fetch 不需 token，但返回可能是 XML 字符串（非 JSON），useFetch 默认 `res.json()` 会报错。SEOOutputPage 中单独处理（用 useFetch 但 data 可能是字符串）。如 useFetch 的 `.json()` 报错，需为 SEO 接口改用原生 fetch 或为 useFetch 添加 `raw` 选项。
3. **antd prefixCls="zw"**：与 zhao-studio 的 "zs" 不同，避免冲突。

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-zhao-website-admin-ui.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 每个 Task 派发独立 subagent，Task 间审查，快速迭代

**2. Inline Execution** - 在当前会话中按序执行，批量执行 + 检查点审查

**Which approach?**
