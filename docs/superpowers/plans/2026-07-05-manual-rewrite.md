# 使用手册重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全量重写三份使用手册（admin/shao-catalog/user-guide），并在 web 后台集成网页浏览（含全文搜索 + 关键词高亮）。

**Architecture:** 12 个 md 文档放 docs/manual/ 下；web 后台新增 /pages/manual/ 三个 vue 页面（index/viewer/search）+ 一个 search-index.ts；用 markdown-it 渲染；用 Vite import.meta.glob 静态加载所有 md；客户端子串匹配搜索 + 评分排序 + mark 高亮。

**Tech Stack:** markdown（文档）、Vue 3 + uni-app（web 后台）、markdown-it（渲染）、Vite import.meta.glob（静态加载）。

---

## File Structure

### 文档文件（12 个）

| 路径 | 操作 | 责任 |
|---|---|---|
| `docs/manual/admin/index.md` | 重写 | admin 总入口 |
| `docs/manual/admin/02-add-tenant.md` | 重写 | 含 channelUsage 步骤 |
| `docs/manual/admin/07-channel-usage.md` | 新建 | 三档语义 + 联动 |
| `docs/manual/admin/web-catalog.md` | 新建 | web 全量页面清单 |
| `docs/manual/shao-catalog/index.md` | 新建 | shao 总入口 |
| `docs/manual/shao-catalog/pages.md` | 新建 | shao 全量页面清单 |
| `docs/manual/user-guide/index.md` | 新建 | 用户手册总入口 |
| `docs/manual/user-guide/01-register-login.md` | 新建 | 注册登录 |
| `docs/manual/user-guide/02-browse-course.md` | 新建 | 浏览课程 |
| `docs/manual/user-guide/03-study-quiz.md` | 新建 | 学习答题 |
| `docs/manual/user-guide/04-points-signin.md` | 新建 | 积分签到 |
| `docs/manual/user-guide/05-exchange.md` | 新建 | 积分兑换 |

### 代码文件（6 个）

| 路径 | 操作 | 责任 |
|---|---|---|
| `web/pages/manual/index.vue` | 新建 | 手册首页 |
| `web/pages/manual/viewer.vue` | 新建 | markdown 查看器 |
| `web/pages/manual/search.vue` | 新建 | 搜索页 |
| `web/pages/manual/search-index.ts` | 新建 | 索引 + 搜索 + 高亮 |
| `web/pages.json` | 修改 | 加 3 个路由 |
| `web/pages/system/tools.vue` | 修改 | 加使用手册入口 |

---

### Task 1: 安装 markdown-it 依赖

**Files:**
- Modify: `e:/code/web/package.json`

- [ ] **Step 1: 安装 markdown-it**

Run（在 e:/code/web 目录下）:
```bash
cd e:/code/web && npm install markdown-it
```

Expected: package.json dependencies 多出 `markdown-it`

- [ ] **Step 2: 验证安装**

Run:
```bash
cd e:/code/web && node -e "const m = require('markdown-it'); console.log(typeof m)" 
```

Expected: 输出 `function`

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add web/package.json web/package-lock.json && git commit -m "chore(web): add markdown-it dependency for manual viewer"
```

---

### Task 2: admin 文档（4 篇）

**Files:**
- Modify: `docs/manual/admin/index.md`
- Modify: `docs/manual/admin/02-add-tenant.md`
- Create: `docs/manual/admin/07-channel-usage.md`
- Create: `docs/manual/admin/web-catalog.md`

- [ ] **Step 1: 重写 admin/index.md**

写入 `e:/code/docs/manual/admin/index.md`：

```markdown
# Admin 后台用户使用手册

本手册面向 admin 超级管理员，覆盖系统管理 + 业务监督两大职责。

## 工作流程

1. [首次系统初始化](01-initial-setup.md) — 首次部署后必做配置
2. [新增租户](02-add-tenant.md) — 创建租户并分配管理员（含跨渠道开关）
3. [业务监督](03-business-overview.md) — 巡视各业务模块数据
4. [权限管理](04-permission-management.md) — 角色/用户/渠道权限
5. [模板与站点配置](05-template-config.md) — 模板样式 + 细粒度配置
6. [跨渠道开关配置](07-channel-usage.md) — channelUsage 三档语义与联动
7. [系统维护](06-system-maintenance.md) — OSS/三方/系统工具

## web 目录速查

见 [web 目录全量页面清单](web-catalog.md)

## admin 职责速查表

7 个粗粒度模块开关，在 `/pages/tenant/detail` 的"功能开关"区块控制：

| 开关 | 说明 | 关联页面 |
|---|---|---|
| sso | SSO 单点登录 | `/pages/third/config-list` |
| points | 积分系统 | `/pages/points/config` |
| quiz | 题库管理 | `/pages/quiz/list` |
| course | 课程管理 | `/pages/course/list` |
| channel | 渠道管理 | `/pages/channel/list` |
| thirdParty | 三方登录 | `/pages/third/config-list` |
| oss | OSS 存储 | `/pages/oss/settings` |

关闭某开关后，对应模块在前端菜单中隐藏，后端 API 拒绝访问。
```

- [ ] **Step 2: 重写 admin/02-add-tenant.md**

写入 `e:/code/docs/manual/admin/02-add-tenant.md`：

```markdown
# 新增租户

创建新租户并分配渠道管理员的完整流程。

## 步骤

1. 新建租户 → `/pages/tenant/detail`
   - 填写站点名称（siteName）、域名（domain）
   - 域名用于 C 端识别租户（site-resolver 中间件按域名匹配）

2. 关联渠道 → 同页"关联渠道"区块
   - 点击"添加渠道"，选择已有渠道
   - 租户必须关联至少 1 个渠道，否则该租户下无数据可见

3. 配置功能开关 → 同页"功能开关"区块
   - 按租户需求开启模块（course/points/quiz/channel 等）
   - 关闭的模块在该租户的前端菜单中隐藏

4. 配置模板样式 → 同页"模板样式"区块
   - 选择预设模板（coursera-blue/khan-green/udemy-violet/edx-deep/netease-red）
   - 或自定义主题色、tabBar 颜色
   - 不配置则使用默认主题（#667eea）

5. 分配渠道管理员 → `/pages/system/user-roles`
   - 选择目标用户
   - 分配 channel-admin 角色
   - channel-admin 只能管理自己归属渠道关联的租户

6. 配置跨渠道开关 → 同页"渠道配置"区块
   - 开关 ON（默认 site_cross_user）：用户可见跨渠道课程/分类，可使用个人渠道数据
   - 开关 OFF（site_only）：仅展示站点渠道数据，跨渠道内容全部屏蔽
   - 该开关优先级高于站点配置页的"跨渠道访问"子开关
   - 详见 [07-channel-usage.md](07-channel-usage.md)

## 验证

- 用 channel-admin 账号登录后台
- 控制台顶部租户切换器显示该租户
- 切换到该租户后，能看到关联渠道的数据
- 跨渠道开关状态与配置一致
```

- [ ] **Step 3: 新建 admin/07-channel-usage.md**

写入 `e:/code/docs/manual/admin/07-channel-usage.md`：

```markdown
# 跨渠道开关配置

channelUsage 字段控制租户级别的跨渠道功能总开关。

## 三档语义

| 值 | crossChannelEnabled | mergedChannelIds | 业务含义 |
|---|---|---|---|
| site_only | false | siteChannelIds | 仅站点渠道 |
| site_and_cross | true | siteChannelIds | 站点+跨渠道 |
| site_cross_user（默认） | true | site∪user | 站点+跨渠道+个人 |

- `crossChannelEnabled`：是否允许跨渠道内容可见
- `mergedChannelIds`：合并后的可见渠道 id 列表

## 配置位置

### 主开关（可编辑）

路径：`/pages/tenant/detail` → "渠道配置"区块 → "是否允许跨渠道"开关

- ON → `site_cross_user`
- OFF → `site_only`

### 子开关（只读 + 联动）

路径：`/pages/settings/site-config` → "渠道配置"区块

- 顶部显示"跨渠道总开关"只读徽章（已开启/已关闭）
- 下方"跨渠道访问"开关在 site_only 时灰色禁用

## 联动规则

| 主开关 | 子开关"跨渠道访问"状态 |
|---|---|
| site_only | 灰色禁用，无法点击 |
| site_cross_user | 正常可编辑 |

## 后端过滤公式

```
record 可见 =
  (channelScope === 'all')
  || (crossChannelEnabled && allowCrossChannel === true)
  || (channelScope === 'specific' && channelIds ∩ mergedChannelIds 非空)
```

## 验证步骤

1. 租户详情页切到 site_only → 保存
2. 站点配置页刷新 → "跨渠道访问"开关灰色禁用
3. 课程接口返回：仅站点渠道课程，跨渠道课程屏蔽
4. 租户详情页切回 site_cross_user → 保存
5. 站点配置页刷新 → "跨渠道访问"开关可编辑
6. 课程接口返回：含跨渠道课程
```

- [ ] **Step 4: 新建 admin/web-catalog.md**

写入 `e:/code/docs/manual/admin/web-catalog.md`：

```markdown
# web 后台页面清单

按业务模块分组，每页注明路径 + 职责。

## 租户管理

- `/pages/tenant/list` — 租户列表
- `/pages/tenant/detail` — 租户详情/编辑（含 channelUsage 开关）

## 课程管理

- `/pages/course/list` — 课程列表
- `/pages/course/form` — 课程编辑
- `/pages/course/detail` — 课程详情
- `/pages/course/category/list` — 分类列表
- `/pages/course/category/form` — 分类编辑
- `/pages/course/lesson/list` — 课时列表
- `/pages/course/lesson/form` — 课时编辑
- `/pages/course/lesson/detail` — 课时详情
- `/pages/course/tag/list` — 课程标签
- `/pages/course/auth/list` — 课程权限

## 题库管理

- `/pages/quiz/list` — 题库列表
- `/pages/quiz/form` — 题目编辑
- `/pages/quiz/exam/list` — 试卷列表
- `/pages/quiz/exam/form` — 试卷编辑
- `/pages/quiz/record/list` — 答题记录
- `/pages/quiz/record/detail` — 记录详情
- `/pages/quiz/batch-upload` — 批量上传

## 积分兑换

- `/pages/points/config` — 积分配置
- `/pages/points/rules` — 积分规则
- `/pages/points/types` — 积分类型
- `/pages/points/statistics` — 积分统计
- `/pages/points/records` — 积分记录
- `/pages/points/sign-in-records` — 签到记录
- `/pages/points/products` — 兑换商品
- `/pages/points/exchanges` — 兑换记录
- `/pages/points/pickup-locations` — 自提点
- `/pages/points/pickup-verify` — 自提核销

## 渠道管理

- `/pages/channel/list` — 渠道列表
- `/pages/channel/detail` — 渠道详情
- `/pages/channel/members` — 成员管理
- `/pages/channel/network` — 渠道网络

## 系统设置

- `/pages/settings/site-config` — 站点配置（含 channelUsage 只读展示）
- `/pages/settings/site-template` — 模板配置
- `/pages/system/user-roles` — 用户角色
- `/pages/system/role-management` — 角色管理
- `/pages/system/permissions` — 权限配置
- `/pages/system/role-logs` — 操作日志
- `/pages/system/tools` — 系统工具（含使用手册入口）
- `/pages/system/profile` — 个人资料

## 其他

- `/pages/dashboard` — 仪表盘
- `/pages/login` — 登录
- `/pages/register` — 注册
- `/pages/auth-callback` — 三方回调
- `/pages/oss/dashboard` — OSS 仪表盘
- `/pages/oss/records` — OSS 记录
- `/pages/oss/settings` — OSS 配置
- `/pages/media/list` — 媒体库
- `/pages/tag/list` — 标签管理
- `/pages/tag/form` — 标签编辑
- `/pages/tag/groups` — 标签分组
- `/pages/tag/knowledge` — 知识点
- `/pages/tag/knowledge-form` — 知识点编辑
- `/pages/tag/presets` — 预设标签
- `/pages/tag/search` — 标签搜索
- `/pages/third/config-list` — 三方配置
- `/pages/third/config-form` — 三方编辑
- `/pages/third/accounts` — 三方账号
- `/pages/third-party/config` — 三方配置（旧）
- `/pages/distribution/invites` — 邀请分销
- `/pages/redemption/codes` — 兑换码
- `/pages/redemption/records` — 兑换记录
- `/pages/study/progress` — 学习进度
- `/pages/study/lesson-progress` — 课时进度
- `/pages/verification/records` — 核销记录
- `/pages/manual/index` — 使用手册首页
- `/pages/manual/viewer` — 文档查看器
- `/pages/manual/search` — 文档搜索
```

- [ ] **Step 5: Commit**

```bash
cd e:/code && git add docs/manual/admin/ && git commit -m "docs(manual): rewrite admin manual with channelUsage section and web-catalog"
```

---

### Task 3: shao-catalog 文档（2 篇）

**Files:**
- Create: `docs/manual/shao-catalog/index.md`
- Create: `docs/manual/shao-catalog/pages.md`

- [ ] **Step 1: 新建 shao-catalog/index.md**

写入 `e:/code/docs/manual/shao-catalog/index.md`：

```markdown
# C 端（shao）目录

本目录是用户端 uni-app 项目，所有页面在 `shao/pages/` 下。

## 页面清单

见 [pages.md](pages.md)

## 页面分类

- 认证类：login / register / forgot-password / auth-callback
- 课程类：index / course-detail / my-course / video-player / quiz
- 积分类：sign-in / tasks / points-record / exchange / redeem-record
- 自提类：pickup-location/list / pickup-location/detail
- 个人类：profile / guide
```

- [ ] **Step 2: 新建 shao-catalog/pages.md**

写入 `e:/code/docs/manual/shao-catalog/pages.md`：

```markdown
# shao 页面全量清单

## 认证

- `/pages/login/login` — 登录
- `/pages/register/register` — 注册
- `/pages/forgot-password/forgot-password` — 忘记密码
- `/pages/auth-callback/auth-callback` — 三方登录回调

## 首页与课程

- `/pages/index/index` — 首页（课程列表入口）
- `/pages/course-detail/course-detail` — 课程详情
- `/pages/my-course/my-course` — 我的课程
- `/pages/video-player/video-player` — 视频播放器（含答题弹窗、积分领取、渠道选择）
- `/pages/quiz/quiz` — 答题页

## 积分

- `/pages/sign-in/sign-in` — 每日签到
- `/pages/tasks/tasks` — 任务列表
- `/pages/points-record/points-record` — 积分明细
- `/pages/exchange/exchange` — 积分兑换（含自提点兜底逻辑）
- `/pages/redeem-record/redeem-record` — 兑换记录

## 自提

- `/pages/pickup-location/list` — 自提点列表
- `/pages/pickup-location/detail` — 自提点详情

## 个人

- `/pages/profile/profile` — 个人中心
- `/pages/guide/guide` — 使用指南
```

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add docs/manual/shao-catalog/ && git commit -m "docs(manual): add shao-catalog pages list"
```

---

### Task 4: user-guide 文档（6 篇）

**Files:**
- Create: `docs/manual/user-guide/index.md`
- Create: `docs/manual/user-guide/01-register-login.md`
- Create: `docs/manual/user-guide/02-browse-course.md`
- Create: `docs/manual/user-guide/03-study-quiz.md`
- Create: `docs/manual/user-guide/04-points-signin.md`
- Create: `docs/manual/user-guide/05-exchange.md`

- [ ] **Step 1: 新建 user-guide/index.md**

写入 `e:/code/docs/manual/user-guide/index.md`：

```markdown
# C 端用户使用手册

本手册面向终端用户，按实际使用流程顺序书写。

## 流程

1. [注册与登录](01-register-login.md)
2. [浏览课程](02-browse-course.md)
3. [学习与答题](03-study-quiz.md)
4. [积分与签到](04-points-signin.md)
5. [积分兑换](05-exchange.md)
```

- [ ] **Step 2: 新建 user-guide/01-register-login.md**

写入 `e:/code/docs/manual/user-guide/01-register-login.md`：

```markdown
# 注册与登录

## 注册

- 入口：`/pages/register/register`
- 必填：手机号、密码、确认密码
- 可选：邀请码（渠道邀请码决定用户归属渠道）
- 协议：勾选用户协议

## 登录

- 入口：`/pages/login/login`
- 本地登录：手机号 + 密码 / 验证码
- 三方登录：微信/支付宝/抖音（由后台开关控制可见性）

## 忘记密码

- 入口：`/pages/forgot-password/forgot-password`
- 通过手机验证码重置

## 三方登录回调

- 入口：`/pages/auth-callback/auth-callback`
- 三方授权后自动跳转

## 渠道归属

- 注册时填写的邀请码决定用户渠道归属
- 登录后访问的课程/商品按渠道权限过滤
```

- [ ] **Step 3: 新建 user-guide/02-browse-course.md**

写入 `e:/code/docs/manual/user-guide/02-browse-course.md`：

```markdown
# 浏览课程

## 首页

- 入口：`/pages/index/index`
- 展示：课程分类 + 课程列表
- 课程分类按 channelUsage 规则过滤：
  - 跨渠道开启：可见跨渠道分类
  - 跨渠道关闭：仅可见站点渠道分类

## 课程详情

- 入口：`/pages/course-detail/course-detail`
- 展示：封面、简介、课时列表、标签
- 课时点击进入视频播放页

## 我的课程

- 入口：`/pages/my-course/my-course`
- 展示已报名/已学习课程
- 按学习进度排序
```

- [ ] **Step 4: 新建 user-guide/03-study-quiz.md**

写入 `e:/code/docs/manual/user-guide/03-study-quiz.md`：

```markdown
# 学习与答题

## 视频学习

- 入口：`/pages/video-player/video-player`
- 播放视频自动记录学习进度
- 进度达标可领取积分

## 答题

- 视频播放中触发答题弹窗
- 答对题目获得积分
- 积分领取需选择归属渠道：
  - 单渠道：自动归属，不弹窗
  - 多渠道：弹窗让用户选择
  - 全渠道：弹窗让用户选择

## 渠道选择弹窗

- 显示渠道名称（非 ID）
- 单选
- 取消/确定按钮
- 数据多时支持滚动
```

- [ ] **Step 5: 新建 user-guide/04-points-signin.md**

写入 `e:/code/docs/manual/user-guide/04-points-signin.md`：

```markdown
# 积分与签到

## 每日签到

- 入口：`/pages/sign-in/sign-in`
- 每日签到获得固定积分
- 连续签到有额外奖励

## 任务列表

- 入口：`/pages/tasks/tasks`
- 完成任务获得积分
- 任务类型：学习/答题/邀请等

## 积分明细

- 入口：`/pages/points-record/points-record`
- 展示积分收入/支出记录
- 支持按类型筛选

## 积分结构

- 本渠道积分：用户当前渠道积分
- 跨渠道积分：用户其他渠道积分（跨渠道开关开启时可用）
- 全局积分：不归属渠道的积分
```

- [ ] **Step 6: 新建 user-guide/05-exchange.md**

写入 `e:/code/docs/manual/user-guide/05-exchange.md`：

```markdown
# 积分兑换

## 商品列表

- 入口：`/pages/exchange/exchange`
- 展示可兑换商品
- 商品按渠道权限过滤

## 兑换流程

1. 点击商品 → 弹出兑换弹窗
2. 选择配送方式：
   - 快递配送：填写收件人/电话/地址
   - 到店自提：选择自提点
3. 积分扣减：
   - 优先扣本渠道积分
   - 跨渠道商品可扣其他渠道积分（需开关开启）
   - 最后扣全局积分
4. 确认兑换

## 自提点规则

- 商品指定渠道 + 配送方式含自提 → 显示自提点
- 自提点数量 0：隐藏自提选项，仅快递
- 自提点数量 1：自动选中
- 自提点数量 >1：单选
- 跨渠道商品（无 channelId）：隐藏自提，强制快递

## 兑换记录

- 入口：`/pages/redeem-record/redeem-record`
- 展示兑换状态：待发货/已发货/待自提/已完成
```

- [ ] **Step 7: Commit**

```bash
cd e:/code && git add docs/manual/user-guide/ && git commit -m "docs(manual): add user-guide with 5 sections by user flow"
```

---

### Task 5: 新建 search-index.ts（索引 + 搜索 + 高亮）

**Files:**
- Create: `e:/code/web/pages/manual/search-index.ts`

- [ ] **Step 1: 新建 search-index.ts**

写入 `e:/code/web/pages/manual/search-index.ts`：

```ts
/**
 * 使用手册全文搜索索引
 * - 客户端子串匹配
 * - 评分排序（标题 100 > 标题 50 > 内容 10）
 * - 关键词高亮（<mark>）
 */

export interface SearchEntry {
  doc: string           // 相对路径，如 admin/02-add-tenant.md
  title: string         // 一级标题
  content: string       // 纯文本内容（剥离 markdown）
  headings: string[]    // 所有标题文本
}

export interface SearchResult {
  doc: string
  title: string
  snippet: string       // 摘要（含匹配位置前后 50 字）
  score: number
}

let cachedIndex: SearchEntry[] | null = null

/**
 * 构建搜索索引（module 级缓存）
 * @param docs import.meta.glob 加载的 md 文件 map
 */
export function buildIndex(docs: Record<string, string>): SearchEntry[] {
  if (cachedIndex) return cachedIndex
  cachedIndex = Object.entries(docs).map(([path, raw]) => {
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
  return cachedIndex
}

/**
 * 搜索
 */
export function search(query: string, index: SearchEntry[]): SearchResult[] {
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

/**
 * 关键词高亮（返回 HTML 字符串，需用 v-html 渲染）
 */
export function highlight(text: string, query: string): string {
  if (!query) return escapeHtml(text)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, 'gi')
  return escapeHtml(text).replace(re, '<mark>$&</mark>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/manual/search-index.ts && git commit -m "feat(web/manual): add search-index.ts with substring search and highlight"
```

---

### Task 6: 新建 manual/index.vue（手册首页）

**Files:**
- Create: `e:/code/web/pages/manual/index.vue`

- [ ] **Step 1: 新建 manual/index.vue**

写入 `e:/code/web/pages/manual/index.vue`：

```vue
<template>
  <view class="manual-index">
    <PageHeader title="使用手册" />

    <view class="search-entry" @click="goSearch">
      <text class="search-icon">🔍</text>
      <text class="search-placeholder">搜索文档...</text>
    </view>

    <view class="manual-card" v-for="m in manuals" :key="m.key" @click="goViewer(m.indexDoc)">
      <text class="manual-title">{{ m.title }}</text>
      <text class="manual-desc">{{ m.desc }}</text>
      <text class="manual-arrow">→</text>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'

const manuals = [
  { key: 'admin', title: '后台管理手册', desc: '面向 admin 超级管理员，覆盖系统管理 + 业务监督', indexDoc: 'admin/index.md' },
  { key: 'shao', title: 'C 端目录', desc: 'shao 用户端页面清单', indexDoc: 'shao-catalog/index.md' },
  { key: 'user', title: '用户使用手册', desc: '面向终端用户，按使用流程顺序书写', indexDoc: 'user-guide/index.md' },
]

function goViewer(doc) {
  uni.navigateTo({ url: `/pages/manual/viewer?doc=${encodeURIComponent(doc)}` })
}

function goSearch() {
  uni.navigateTo({ url: '/pages/manual/search' })
}
</script>

<style scoped>
.manual-index { padding: 20rpx; }

.search-entry {
  display: flex; align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #e4e7ed;
}
.search-icon { font-size: 32rpx; margin-right: 16rpx; }
.search-placeholder { color: #a8abb2; font-size: 28rpx; }

.manual-card {
  position: relative;
  padding: 32rpx 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #e4e7ed;
}
.manual-title { display: block; font-size: 32rpx; font-weight: 600; color: #303133; margin-bottom: 8rpx; }
.manual-desc { display: block; font-size: 26rpx; color: #909399; }
.manual-arrow { position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%); color: #c0c4cc; font-size: 32rpx; }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/manual/index.vue && git commit -m "feat(web/manual): add manual index page with 3 entry cards"
```

---

### Task 7: 新建 manual/viewer.vue（markdown 查看器）

**Files:**
- Create: `e:/code/web/pages/manual/viewer.vue`

- [ ] **Step 1: 新建 manual/viewer.vue**

写入 `e:/code/web/pages/manual/viewer.vue`：

```vue
<template>
  <view class="manual-viewer">
    <PageHeader :title="currentTitle || '文档查看'">
      <view class="header-actions">
        <text class="search-btn" @click="goSearch">🔍</text>
      </view>
    </PageHeader>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="error" class="error">{{ error }}</view>
    <scroll-view v-else scroll-y class="markdown-body">
      <view v-html="renderedHtml"></view>

      <view class="doc-nav">
        <view v-if="prevDoc" class="nav-btn prev" @click="goDoc(prevDoc)">← 上一篇</view>
        <view v-if="nextDoc" class="nav-btn next" @click="goDoc(nextDoc)">下一篇 →</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import MarkdownIt from 'markdown-it'
import PageHeader from '../../components/PageHeader.vue'

const md = new MarkdownIt({ html: true, linkify: true })

const docs = import.meta.glob('../../../docs/manual/**/*.md', { as: 'raw', eager: true })

const currentDoc = ref('')
const content = ref('')
const loading = ref(true)
const error = ref('')

const renderedHtml = computed(() => md.render(content.value))
const currentTitle = computed(() => {
  const line = content.value.split('\n').find(l => l.startsWith('#'))
  return line ? line.replace(/^#+\s*/, '') : ''
})

const prevDoc = computed(() => {
  const order = getIndexOrder()
  const idx = order.indexOf(currentDoc.value)
  return idx > 0 ? order[idx - 1] : null
})

const nextDoc = computed(() => {
  const order = getIndexOrder()
  const idx = order.indexOf(currentDoc.value)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null
})

function getIndexOrder() {
  // 简化版：按 admin/shao-catalog/user-guide 三个 index 中的链接顺序扁平化
  // 实际从 docs 中读取
  const adminIndex = docs['/e:/code/docs/manual/admin/index.md'] || docs['../../../docs/manual/admin/index.md']
  const shaoIndex = docs['/e:/code/docs/manual/shao-catalog/index.md'] || docs['../../../docs/manual/shao-catalog/index.md']
  const userIndex = docs['/e:/code/docs/manual/user-guide/index.md'] || docs['../../../docs/manual/user-guide/index.md']
  const order = []
  const extractLinks = (raw) => {
    if (!raw) return
    const re = /\[([^\]]+)\]\(([^)]+\.md)\)/g
    let m
    while ((m = re.exec(raw)) !== null) {
      order.push(m[2])
    }
  }
  extractLinks(adminIndex)
  extractLinks(shaoIndex)
  extractLinks(userIndex)
  return order
}

function loadDoc(docPath) {
  loading.value = true
  error.value = ''
  const key = `/e:/code/docs/manual/${docPath}`
  const altKey = `../../../docs/manual/${docPath}`
  const raw = docs[key] || docs[altKey]
  if (!raw) {
    error.value = `文档不存在: ${docPath}`
    loading.value = false
    return
  }
  content.value = raw
  currentDoc.value = docPath
  loading.value = false
}

onLoad((opts) => {
  const doc = opts.doc ? decodeURIComponent(opts.doc) : 'admin/index.md'
  loadDoc(doc)
})

function goSearch() {
  uni.navigateTo({ url: '/pages/manual/search' })
}

function goDoc(doc) {
  uni.redirectTo({ url: `/pages/manual/viewer?doc=${encodeURIComponent(doc)}` })
}
</script>

<style scoped>
.manual-viewer { height: 100vh; display: flex; flex-direction: column; }
.header-actions { display: flex; align-items: center; }
.search-btn { font-size: 32rpx; padding: 0 16rpx; }

.loading, .error { padding: 80rpx; text-align: center; color: #909399; }

.markdown-body {
  flex: 1;
  padding: 32rpx;
  background: #fff;
}
.markdown-body :deep(h1) { font-size: 40rpx; font-weight: 700; margin: 24rpx 0 16rpx; color: #303133; }
.markdown-body :deep(h2) { font-size: 34rpx; font-weight: 600; margin: 24rpx 0 12rpx; color: #303133; }
.markdown-body :deep(h3) { font-size: 30rpx; font-weight: 600; margin: 16rpx 0 8rpx; color: #303133; }
.markdown-body :deep(p) { font-size: 28rpx; line-height: 1.7; color: #606266; margin: 12rpx 0; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 40rpx; margin: 12rpx 0; }
.markdown-body :deep(li) { font-size: 28rpx; line-height: 1.7; color: #606266; }
.markdown-body :deep(code) { background: #f5f7fa; padding: 2rpx 8rpx; border-radius: 4rpx; font-family: monospace; font-size: 26rpx; }
.markdown-body :deep(pre) { background: #f5f7fa; padding: 16rpx; border-radius: 8rpx; overflow-x: auto; margin: 16rpx 0; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 16rpx 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1rpx solid #dcdfe6; padding: 8rpx 12rpx; font-size: 26rpx; }
.markdown-body :deep(th) { background: #f5f7fa; font-weight: 600; }
.markdown-body :deep(a) { color: #409eff; text-decoration: underline; }
.markdown-body :deep(blockquote) { border-left: 4rpx solid #dcdfe6; padding-left: 16rpx; color: #909399; margin: 16rpx 0; }

.doc-nav { display: flex; justify-content: space-between; padding: 32rpx 0; border-top: 1rpx solid #e4e7ed; margin-top: 32rpx; }
.nav-btn { padding: 16rpx 24rpx; background: #f5f7fa; border-radius: 8rpx; font-size: 26rpx; color: #606266; }
.nav-btn.next { margin-left: auto; }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/manual/viewer.vue && git commit -m "feat(web/manual): add markdown viewer with markdown-it rendering"
```

---

### Task 8: 新建 manual/search.vue（搜索页）

**Files:**
- Create: `e:/code/web/pages/manual/search.vue`

- [ ] **Step 1: 新建 manual/search.vue**

写入 `e:/code/web/pages/manual/search.vue`：

```vue
<template>
  <view class="search-page">
    <PageHeader title="搜索文档" />

    <view class="search-bar">
      <input
        class="search-input"
        v-model="query"
        placeholder="输入关键词搜索..."
        @input="onInput"
        confirm-type="search"
      />
      <text v-if="query" class="clear-btn" @click="clearQuery">×</text>
    </view>

    <view v-if="!query" class="empty-hint">
      <text>输入关键词开始搜索</text>
    </view>

    <view v-else-if="results.length === 0" class="empty-hint">
      <text>未找到匹配的文档</text>
    </view>

    <scroll-view v-else scroll-y class="result-list">
      <view class="result-count">共 {{ results.length }} 条结果</view>
      <view
        v-for="r in results"
        :key="r.doc"
        class="result-item"
        @click="goDoc(r.doc)"
      >
        <text class="result-title">{{ r.title || r.doc }}</text>
        <view class="result-snippet" v-html="highlight(r.snippet, query)"></view>
        <text class="result-path">{{ r.doc }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { buildIndex, search, highlight } from './search-index'

const docs = import.meta.glob('../../../docs/manual/**/*.md', { as: 'raw', eager: true })
const index = buildIndex(docs)

const query = ref('')
const results = ref([])
let timer = null

function onInput() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    results.value = search(query.value, index)
  }, 200)
}

function clearQuery() {
  query.value = ''
  results.value = []
}

function goDoc(doc) {
  uni.navigateTo({ url: `/pages/manual/viewer?doc=${encodeURIComponent(doc)}` })
}
</script>

<style scoped>
.search-page { height: 100vh; display: flex; flex-direction: column; }

.search-bar {
  display: flex; align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e4e7ed;
}
.search-input {
  flex: 1;
  padding: 16rpx 24rpx;
  background: #f5f7fa;
  border-radius: 24rpx;
  font-size: 28rpx;
}
.clear-btn { font-size: 40rpx; color: #c0c4cc; padding: 0 16rpx; }

.empty-hint { padding: 120rpx 0; text-align: center; color: #909399; font-size: 28rpx; }

.result-list { flex: 1; padding: 16rpx 24rpx; }
.result-count { font-size: 24rpx; color: #909399; margin-bottom: 16rpx; }

.result-item {
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #e4e7ed;
}
.result-title { display: block; font-size: 30rpx; font-weight: 600; color: #303133; margin-bottom: 8rpx; }
.result-snippet { font-size: 26rpx; color: #606266; line-height: 1.6; margin-bottom: 8rpx; }
.result-snippet :deep(mark) { background: #fef08a; color: #92400e; padding: 0 4rpx; border-radius: 2rpx; }
.result-path { font-size: 22rpx; color: #c0c4cc; }
</style>
```

- [ ] **Step 2: Commit**

```bash
cd e:/code && git add web/pages/manual/search.vue && git commit -m "feat(web/manual): add search page with highlight and debounce"
```

---

### Task 9: pages.json 加 3 个路由

**Files:**
- Modify: `e:/code/web/pages.json`

- [ ] **Step 1: 在 pages 数组末尾追加 3 个路由**

在 [web/pages.json](file:///e:/code/web/pages.json) 的 `pages` 数组中（最后一个 page 对象后）追加：

```json
,
{
  "path": "pages/manual/index",
  "style": {
    "navigationBarTitleText": "使用手册"
  }
},
{
  "path": "pages/manual/viewer",
  "style": {
    "navigationBarTitleText": "文档查看"
  }
},
{
  "path": "pages/manual/search",
  "style": {
    "navigationBarTitleText": "搜索文档"
  }
}
```

- [ ] **Step 2: 验证 JSON 合法**

Run:
```bash
cd e:/code/web && node -e "JSON.parse(require('fs').readFileSync('pages.json','utf8')); console.log('OK')"
```

Expected: 输出 `OK`

- [ ] **Step 3: Commit**

```bash
cd e:/code && git add web/pages.json && git commit -m "feat(web): add 3 manual routes to pages.json"
```

---

### Task 10: system/tools.vue 加使用手册入口

**Files:**
- Modify: `e:/code/web/pages/system/tools.vue`

- [ ] **Step 1: 在 tools.vue template 末尾加使用手册区块**

在 [web/pages/system/tools.vue](file:///e:/code/web/pages/system/tools.vue) 的 template 中（最后一个 form-section 后、PageHeader 闭合前）追加：

```vue
<view class="form-section">
  <view class="form-card">
    <view class="section-title">使用手册</view>
    <view class="form-item" @click="goManual">
      <text class="form-label">打开使用手册</text>
      <text class="form-arrow">→</text>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 在 script 中加 goManual 方法**

在 tools.vue 的 script 部分追加：

```js
function goManual() {
  uni.navigateTo({ url: '/pages/manual/index' })
}
```

- [ ] **Step 3: 在 style 中追加 form-arrow 样式**

在 tools.vue 的 style 部分追加：

```scss
.form-arrow { color: #c0c4cc; font-size: 32rpx; }
```

- [ ] **Step 4: Commit**

```bash
cd e:/code && git add web/pages/system/tools.vue && git commit -m "feat(web/tools): add manual entry in system tools page"
```

---

### Task 11: 浏览器验证

**Files:** 无文件改动，仅人工验证

- [ ] **Step 1: 重启 web 前端 dev server**

Run:
```bash
cd e:/code/web && npm run dev
```

Expected: 无编译错误，dev server 启动

- [ ] **Step 2: 验证手册首页**

访问 http://localhost:5174/#/pages/manual/index

预期：
1. 显示三张卡片（后台管理手册 / C 端目录 / 用户使用手册）
2. 顶部搜索入口可见
3. 点击卡片跳转到 viewer

- [ ] **Step 3: 验证 viewer**

访问 http://localhost:5174/#/pages/manual/viewer?doc=admin%2Findex.md

预期：
1. 显示 admin/index.md 内容
2. markdown 正确渲染（标题、列表、表格）
3. 链接可点击跳转
4. 上一篇/下一篇导航正确

- [ ] **Step 4: 验证搜索**

访问 http://localhost:5174/#/pages/manual/search

预期：
1. 输入"跨渠道" → 返回相关文档
2. 结果列表显示标题、摘要、路径
3. 摘要中"跨渠道"关键词高亮（黄色背景）
4. 点击结果跳转到 viewer

- [ ] **Step 5: 验证 tools 入口**

访问 http://localhost:5174/#/pages/system/tools

预期：
1. 显示"使用手册"区块
2. 点击"打开使用手册"跳转到 manual/index

- [ ] **Step 6: 验证 channelUsage 文档**

在 viewer 中打开 admin/07-channel-usage.md

预期：
1. 三档语义表格正确渲染
2. 联动规则清晰
3. 验证步骤完整
