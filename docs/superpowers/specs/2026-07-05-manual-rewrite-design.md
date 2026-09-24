# 使用手册重写设计

> **日期**: 2026-07-05
> **主题**: 根据最新变动（channelUsage 跨渠道开关 + 自提点兜底 + 积分兑换修复等）全量重写三份手册，并在 web 后台集成网页浏览

## 1. 背景

近期 channelUsage 三档跨渠道开关、自提点兜底逻辑、积分兑换流程修复等变动需要同步到文档。现有 `docs/manual/admin/` 已有 6 篇手册但内容陈旧，C 端目录与用户使用手册尚不存在。需全量重写，并在 web 后台集成网页浏览（含全文搜索 + 关键词高亮）。

## 2. 目标

1. 重写后台管理手册（admin/），新增 channelUsage 章节 + web-catalog 全量页面清单
2. 新建 C 端目录文档（shao-catalog/），列出 shao 全量页面
3. 新建用户使用手册（user-guide/），按用户使用流程顺序书写
4. 在 web 后台集成网页浏览：手册首页 + markdown 查看器 + 全文搜索（含高亮）
5. 不做中文分词（成本高收益低），不做全文服务端搜索（YAGNI）

## 3. 文档结构

```
docs/manual/
├── admin/                    # 后台管理 web 目录（重写）
│   ├── index.md              # 总入口 + 工作流程导航
│   ├── 01-initial-setup.md   # 首次部署（保留）
│   ├── 02-add-tenant.md      # 新增租户（重写，含 channelUsage）
│   ├── 03-business-overview.md
│   ├── 04-permission-management.md
│   ├── 05-template-config.md
│   ├── 06-system-maintenance.md
│   ├── 07-channel-usage.md   # 新增：跨渠道开关配置详解
│   └── web-catalog.md        # 新增：web 目录全量页面清单
│
├── shao-catalog/             # C 端目录（新建）
│   ├── index.md
│   └── pages.md              # shao 全量页面清单
│
└── user-guide/               # 用户使用手册（新建）
    ├── index.md
    ├── 01-register-login.md
    ├── 02-browse-course.md
    ├── 03-study-quiz.md
    ├── 04-points-signin.md
    └── 05-exchange.md
```

## 4. admin 文档详细内容

### 4.1 admin/index.md

总入口 + 工作流程导航，新增 channelUsage 章节。流程顺序：

1. 首次系统初始化
2. 新增租户（含跨渠道开关）
3. 业务监督
4. 权限管理
5. 模板与站点配置
6. 跨渠道开关配置 ⭐ 新增
7. 系统维护

末尾链接 web 目录速查（web-catalog.md）。

### 4.2 admin/02-add-tenant.md（重写）

新增第 6 步"配置跨渠道开关"：

- 开关 ON（默认）：用户可见跨渠道课程/分类，可使用个人渠道数据
- 开关 OFF：仅展示站点渠道数据，跨渠道内容全部屏蔽
- 优先级高于站点配置页的"跨渠道访问"子开关
- 链接到 07-channel-usage.md

### 4.3 admin/07-channel-usage.md（新增）

channelUsage 三档语义表 + 配置位置 + 联动规则 + 验证步骤。

| 值 | crossChannelEnabled | mergedChannelIds | 业务含义 |
|---|---|---|---|
| site_only | false | siteChannelIds | 仅站点渠道 |
| site_and_cross | true | siteChannelIds | 站点+跨渠道 |
| site_cross_user（默认） | true | site∪user | 站点+跨渠道+个人 |

联动规则：site_only 时站点配置页"跨渠道访问"开关灰色禁用。

### 4.4 admin/web-catalog.md（新增）

web 后台全量页面清单，按业务模块分组：租户管理 / 课程管理 / 题库管理 / 积分兑换 / 渠道管理 / 系统设置 / 其他（OSS/媒体/标签/三方/分销/兑换码/学习/核销）。

## 5. shao-catalog 文档详细内容

### 5.1 shao-catalog/index.md

总入口 + 页面分类（认证/课程/积分/自提/个人）。

### 5.2 shao-catalog/pages.md

shao 全量页面清单，按业务模块分组：认证 / 首页与课程 / 积分 / 自提 / 个人。

## 6. user-guide 文档详细内容

按用户使用流程顺序书写。

### 6.1 user-guide/index.md

总入口 + 流程导航（5 篇）。

### 6.2 user-guide/01-register-login.md

注册 / 登录 / 忘记密码 / 三方回调 / 渠道归属说明。

### 6.3 user-guide/02-browse-course.md

首页 / 课程详情 / 我的课程。说明 channelUsage 对分类过滤的影响。

### 6.4 user-guide/03-study-quiz.md

视频学习 / 答题 / 渠道选择弹窗（单/多/全渠道三种场景）。

### 6.5 user-guide/04-points-signin.md

每日签到 / 任务列表 / 积分明细 / 积分结构（本渠道/跨渠道/全局）。

### 6.6 user-guide/05-exchange.md

商品列表 / 兑换流程 / 自提点规则（0/1/>1 + 跨渠道商品强制快递）/ 兑换记录。

## 7. web 后台浏览页

### 7.1 路由与文件

```
web/pages/manual/
├── index.vue          — 手册首页（三份手册入口卡片 + 搜索入口）
├── viewer.vue         — markdown 查看器
├── search.vue         — 全文搜索页
└── search-index.ts    — 索引构建 + 搜索算法 + 高亮
```

[web/pages.json](file:///e:/code/web/pages.json) 追加三个路由。

### 7.2 index.vue

三张卡片：后台管理手册 / C 端目录 / 用户使用手册。点击跳转到 viewer。顶部搜索入口跳转 search.vue。

### 7.3 viewer.vue

- 使用 `import.meta.glob('../../../docs/manual/**/*.md', { as: 'raw', eager: true })` 预加载所有 md
- 用 markdown-it 渲染为 HTML
- 顶部加搜索按钮，跳转 search.vue
- 末尾加上一篇/下一篇导航

### 7.4 search.vue

- 顶部搜索框
- 输入后实时搜索（防抖 200ms）
- 结果列表显示：文档标题 + 摘要（含高亮）
- 点击跳转 viewer

### 7.5 search-index.ts

#### 索引结构

```ts
interface SearchEntry {
  doc: string           // admin/02-add-tenant.md
  title: string         // 一级标题
  content: string       // 纯文本内容（剥离 markdown）
  headings: string[]    // 所有标题文本
}
```

#### 索引构建

module 级缓存，首次调用时构建：

```ts
function buildIndex(docs: Record<string, string>): SearchEntry[] {
  return Object.entries(docs).map(([path, raw]) => {
    const doc = path.replace(/^.*docs\/manual\//, '')
    const lines = raw.split('\n')
    const title = (lines.find(l => l.startsWith('#')) || '').replace(/^#+\s*/, '')
    const content = raw
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]+\)/g, '$1')
      .replace(/[#>*_\-|`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const headings = lines
      .filter(l => /^#{1,6}\s/.test(l))
      .map(l => l.replace(/^#+\s*/, ''))
    return { doc, title, content, headings }
  })
}
```

#### 搜索算法

简单子串匹配 + 评分排序：

```ts
function search(query: string, index: SearchEntry[]): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []
  for (const entry of index) {
    const titleMatch = entry.title.toLowerCase().includes(q)
    const headingMatch = entry.headings.some(h => h.toLowerCase().includes(q))
    const contentIdx = entry.content.toLowerCase().indexOf(q)
    if (titleMatch || headingMatch || contentIdx >= 0) {
      let score = 0
      if (titleMatch) score += 100
      if (headingMatch) score += 50
      if (contentIdx >= 0) score += 10
      const snippet = contentIdx >= 0
        ? entry.content.slice(Math.max(0, contentIdx - 50), contentIdx + q.length + 50)
        : entry.headings.find(h => h.toLowerCase().includes(q)) || entry.title
      results.push({ doc: entry.doc, title: entry.title, snippet, score })
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 20)
}
```

#### 高亮函数

```ts
function highlight(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), '<mark>$&</mark>')
}
```

### 7.6 依赖

- `markdown-it` — 解析 markdown 为 HTML
- 安装：`cd web && npm install markdown-it`

### 7.7 入口

手册入口放到 `/pages/system/tools` 工具页加一个"使用手册"入口。

### 7.8 不实现（YAGNI）

- 不做中文分词（成本高收益低，子串匹配已覆盖 95% 中文场景）
- 不做服务端搜索（纯前端静态加载）
- 不做搜索历史
- 不做侧边栏目录树（靠 md 内的链接跳转）

## 8. 涉及文件总览

### 8.1 文档文件（新建/重写）

| 路径 | 操作 |
|---|---|
| docs/manual/admin/index.md | 重写 |
| docs/manual/admin/02-add-tenant.md | 重写 |
| docs/manual/admin/07-channel-usage.md | 新建 |
| docs/manual/admin/web-catalog.md | 新建 |
| docs/manual/shao-catalog/index.md | 新建 |
| docs/manual/shao-catalog/pages.md | 新建 |
| docs/manual/user-guide/index.md | 新建 |
| docs/manual/user-guide/01-register-login.md | 新建 |
| docs/manual/user-guide/02-browse-course.md | 新建 |
| docs/manual/user-guide/03-study-quiz.md | 新建 |
| docs/manual/user-guide/04-points-signin.md | 新建 |
| docs/manual/user-guide/05-exchange.md | 新建 |

### 8.2 代码文件（新建）

| 路径 | 操作 |
|---|---|
| web/pages/manual/index.vue | 新建 |
| web/pages/manual/viewer.vue | 新建 |
| web/pages/manual/search.vue | 新建 |
| web/pages/manual/search-index.ts | 新建 |
| web/pages.json | 修改（加 3 个路由） |
| web/pages/system/tools.vue | 修改（加入口） |

## 9. 测试

### 9.1 文档测试

- 所有 md 文件内的链接可达
- channelUsage 三档语义表与后端实现一致
- 自提点规则与 exchange.vue 实现一致

### 9.2 浏览页测试

- /pages/manual/index 三张卡片点击跳转
- /pages/manual/viewer?doc=admin/index.md 正确渲染
- viewer 上一篇/下一篇导航正确
- /pages/manual/search 输入"跨渠道"返回相关文档
- 搜索结果高亮显示匹配关键词
- /pages/system/tools 入口跳转正常
