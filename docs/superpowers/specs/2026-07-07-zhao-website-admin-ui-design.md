# zhao-website Admin UI 设计（仅特殊管理操作）

> 日期：2026-07-07
> 范围：为 zhao-website 插件添加 Admin UI，只覆盖 Content Manager 无法提供的特殊管理操作入口。

## 1. 背景与定位

### 1.1 现状
- zhao-website 一期已完成：18 个 CT + 22 个 service + ~16 个 controller + 6 个迁移脚本
- `admin/src/` 仅有 `index.ts` + `pluginId.ts` 模板，无任何 page/component
- Strapi Content Manager 默认提供 18 个 CT 的 CRUD UI

### 1.2 定位
**只做 Content Manager 无法提供的特殊管理操作入口**，不为 18 CT 重复造 CRUD UI。

参考 zhao-studio antd 5 模式（pluginId 注册 + addMenuLink + 单页 App 路由）。

## 2. 技术栈

- antd 5（与 zhao-studio 一致，已验证可用）
- @strapi/design-system（Strapi 内置）
- 复用 zhao-studio 的 fetch + useFetch hook 模式
- 路由注册在 `admin/src/index.ts`（pluginId: `zhao-website`）

## 3. Admin 入口注册

参考 zhao-studio `admin/src/index.ts` 模式：

```ts
import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '官网管理',
      },
      permissions: [{ action: 'plugin::zhao-website.read', subject: null }],
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
    });
    app.registerPlugin({ id: pluginId, name: '官网管理' });
  },
  bootstrap(app: any) {},
};
```

## 4. 页面设计（6 个）

### 4.1 Dashboard（统计概览）

**对接后端**：`admin-api/stats` controller

**后端实际接口**：
- `GET /api/zhao-website/admin/stats/overview` → `{ articles, products, cases, leads }`（4 个 count）
- `GET /api/zhao-website/admin/stats/lead-stats?days=30` → lead.stats 返回值
- `GET /api/zhao-website/admin/stats/search-stats?days=30` → search-log.stats 返回值

**UI 布局**：
- 顶部 4 个 antd Card：文章数 / 产品数 / 案例数 / 线索数（数字 + 标题）
- 中部 antd Tabs：
  - Tab 1「线索趋势」：近 30 天线索数折线图（echarts）
  - Tab 2「搜索热词」：近 30 天 Top 10 搜索词表格
- 无写操作

### 4.2 Studio Bridge（一键发布）

**对接后端**：`admin-api/studio-bridge` controller

**后端实际接口**：
- `POST /api/zhao-website/admin/studio-bridge/publishFromStudio` → body: 草稿数据

**UI 布局**：
- 顶部说明卡片："从 zhao-studio 草稿一键发布到官网"
- 表单（antd Form）：
  - 选择草稿（Select，从 zhao-studio internal-api 拉取草稿列表）
  - 目标站点（Select，从 zhao-common site-config 拉取）
  - 发布状态（Radio：published/draft）
  - 发布按钮
- 发布成功后 antd message.success + 显示发布结果

**注意**：草稿列表需调用 zhao-studio 的 API（跨插件调用）。如 zhao-studio internal-api 需要鉴权，前端用当前 admin token。

### 4.3 Knowledge Graph（知识图谱管理）

**对接后端**：`admin-api/knowledge-graph` controller

**后端实际接口**：
- `GET .../admin/knowledge-graph/find-entities?entityType=&page=&pageSize=`
- `POST .../admin/knowledge-graph/create-entity`
- `PUT .../admin/knowledge-graph/update-entity/:documentId`
- `DELETE .../admin/knowledge-graph/delete-entity/:documentId`
- `GET .../admin/knowledge-graph/find-relations?subjectEntityId=&predicate=`
- `POST .../admin/knowledge-graph/add-relation`
- `DELETE .../admin/knowledge-graph/delete-relation/:documentId`
- `GET .../admin/knowledge-graph/export-graph`（返回 JSON-LD）

**UI 布局**：
- antd Tabs 两个 Tab：
  - Tab「实体」：Table（name/entityType/slug/status）+ 新建/编辑 Drawer + 删除 Popconfirm
  - Tab「关系」：Table（subjectEntity/predicate/objectEntity/objectValue）+ 新建 Drawer + 删除
- 顶部按钮：「导出 JSON-LD」（点击后 Modal 显示 exportGraph 返回的 JSON，支持复制）

### 4.4 First-Truth（第一真值管理）

**对接后端**：`admin-api/first-truth` controller

**后端实际接口**：
- `GET .../admin/first-truth/find?claimCategory=&verificationStatus=`
- `GET .../admin/first-truth/find-one/:documentId`
- `POST .../admin/first-truth/create`
- `PUT .../admin/first-truth/update/:documentId`
- `DELETE .../admin/first-truth/delete/:documentId`
- `POST .../admin/first-truth/verify/:documentId`
- `GET .../admin/first-truth/conflicts`（返回冲突列表）
- `GET .../admin/first-truth/export-facts`

**UI 布局**：
- 顶部 antd Alert：「检测到 N 个冲突」（点击跳到冲突 Tab）
- antd Tabs 两个 Tab：
  - Tab「真值列表」：Table（claimKey/claim/canonicalValue/verificationStatus/priority）+ 新建/编辑/删除 + verify 按钮
  - Tab「冲突检测」：点击「检测冲突」按钮 → 显示 conflicts 列表（claimKey/severity/values 数组）+ 每条冲突的「查看」按钮跳转真值编辑
- 顶部按钮：「导出 Facts」（exportFacts 返回，Modal 显示 JSON）

### 4.5 AI Summaries（AI 摘要管理）

**对接后端**：`admin-api/ai-content-summary` controller

**后端实际接口**：
- `GET .../admin/ai-content-summary/find-by-target?targetType=&targetId=&summaryType=`
- `POST .../admin/ai-content-summary/create`
- `PUT .../admin/ai-content-summary/update/:documentId`
- `DELETE .../admin/ai-content-summary/delete/:documentId`
- `POST .../admin/ai-content-summary/regenerate/:documentId`

**UI 布局**：
- Table（targetType/targetId/summaryType/content/version/createdAt）
- 操作列：编辑（Drawer）/ 删除（Popconfirm）/ 重新生成（regenerate 按钮 + loading 态）
- 顶部筛选：targetType Select + summaryType Select
- 注：regenerate 后端为桩（spec §4.4.6），UI 先做按钮 + 提示"AI 生成中"

### 4.6 SEO 输出预览

**对接后端**：`content-api/seo-output` controller（公开接口）

**后端实际接口**：
- `GET /api/zhao-website/v1/sitemap.xml`
- `GET /api/zhao-website/v1/robots.txt`
- `GET /api/zhao-website/v1/llms.txt`

**UI 布局**：
- antd Tabs 三个 Tab：
  - Tab「sitemap.xml」：代码框显示 XML（syntax highlight 可选，简单 pre 即可）
  - Tab「robots.txt」：pre 显示文本
  - Tab「llms.txt」：pre 显示文本
- 每个 Tab 顶部「刷新」按钮 + 「复制」按钮
- 注：这些是公开接口，前端直接 fetch（无需 admin token）

## 5. 文件结构

```
plugins/zhao-website/admin/src/
├── index.ts                      # 修改：注册 addMenuLink
├── pluginId.ts                   # 已存在
├── pages/
│   ├── App.tsx                   # 新建：Layout + 路由
│   ├── Dashboard.tsx             # 新建
│   ├── StudioBridge.tsx          # 新建
│   ├── KnowledgeGraph.tsx        # 新建
│   ├── FirstTruth.tsx            # 新建
│   ├── AISummaries.tsx           # 新建
│   └── SEOOutput.tsx             # 新建
├── components/
│   ├── PluginIcon.tsx            # 新建
│   └── Layout.tsx                # 新建：侧边栏 + 内容区
├── hooks/
│   ├── useFetch.ts               # 新建：通用 fetch hook（参考 zhao-studio）
│   └── useWebsiteApi.ts          # 新建：封装各 controller API 调用
└── utils/
    └── api.ts                    # 新建：API 路径常量 + fetch 封装
```

## 6. API 路径约定

- Admin API 前缀：`/api/zhao-website/admin/`
- Content API 前缀：`/api/zhao-website/v1/`
- 所有 admin 请求需带 Strapi admin token（从 Strapi 全局获取，参考 zhao-studio 模式）

## 7. 权限

- 菜单入口权限：`plugin::zhao-website.read`（已在 Task 7 的 permissions.ts 定义）
- 各页面操作权限：依赖后端 channelScopeRoute 的 permission 参数（已定义）

## 8. 不做的事

- 不为 18 CT 做 CRUD UI（用 Content Manager）
- 不做知识图谱可视化编辑器（二期 §8.2）
- 不做 C 端官网渲染（web 前端项目）
- 不做 AI 摘要实际生成（regenerate 后端为桩，UI 先做按钮）
- 不做 echarts 高级图表（Dashboard 仅折线图 + 表格）

## 9. 风险点

1. **跨插件调用 zhao-studio API**：Studio Bridge 页面需拉取草稿列表。如 zhao-studio internal-api 鉴权方式不同，可能需要调整。兜底：admin token 通常通配。
2. **Strapi v5 admin token 获取方式**：需参考 zhao-studio 的 useFetch 实现。
3. **regenerate 桩行为**：后端 regenerate 可能返回固定数据或 throw，UI 需 try/catch + 友好提示。

## 10. 验收标准

1. `npx tsc --noEmit -p admin/tsconfig.json` 退出码 0
2. Strapi admin 后台左侧菜单出现「官网管理」
3. 6 个页面均可访问，无白屏
4. Dashboard 显示 4 个 count 卡片
5. Studio Bridge 表单可提交（即使草稿列表为空也能提交）
6. Knowledge Graph 实体/关系 Table 可加载
7. First-Truth 冲突检测按钮可触发
8. AI Summaries 列表可加载（空列表也行）
9. SEO 输出 3 个 Tab 可显示文本
