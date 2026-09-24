# shao 端站点域名注入与游客渠道过滤修复设计

## 背景与问题

shao 端首页 (`shao/pages/index/index.vue`) 调用 `GET /zhao-course/v1/course-categories` 时未携带站点标识，导致后端 `site-resolver` 中间件无法识别租户，`ctx.state.siteChannelId` 为 undefined，下游 `course-category.find` 服务在游客模式下 `channelIds=[]`，只能返回 `channelScope=all` 与 `allowCrossChannel=true` 的分类，无法按站点关联渠道过滤 `specific` 分类。

进一步排查发现，问题不止 course-categories：shao 端 `request()` 函数未对任何业务 API 注入站点标识，仅 `wx-jssdk.ts` / `wx-h5-login.ts` / `auth-config.ts` 三处手动拼接 `?domain=${SITE_DOMAIN}`。所有公开路由（courses / quiz / points 等）在游客模式下都存在同类问题。

后端 `has-channel-scope` 策略只解析 user，游客分支返回 `channelIds: []`，完全忽略 `ctx.state.siteChannelId` —— 即使前端补全 domain 参数，游客路径依然不会按站点渠道过滤。

## 目标

1. shao 端 `request()` 自动对所有请求注入站点域名
2. 后端 `site-resolver` 提供站点全部渠道（数组），不再仅暴露第一个渠道
3. `has-channel-scope` 策略在游客模式下用站点渠道填充 `channelScope.channelIds`
4. 所有用 `channelScope` 的公开路由（courses / course-categories / quiz / points）自动按站点渠道过滤，无需逐个修改业务 service

## 范围

- **前端**：1 个文件改动
  - `shao/services/api.ts` 的 `request()` 函数
- **后端**：4 个文件改动 + 1 个测试文件修复
  - `basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts`
  - `basic/plugins/zhao-auth/server/src/policies/has-channel-scope.ts`
  - `basic/plugins/zhao-course/server/src/services/course.ts`
  - `basic/plugins/zhao-course/server/src/controllers/course.ts`
  - `basic/plugins/zhao-course/tests/admin-course-list.test.ts`
- **不改动**：`course-category.ts` service / controller（已用 `channelScope` 过滤，自动生效）
- **不改动**：`has-tenant-access.ts`（内部用局部变量 `siteChannelIds`，已是数组，不依赖 `ctx.state.siteChannelId`）

## 架构

```
浏览器 (shao)
  └─ request() headers: { 'x-site-domain': SITE_DOMAIN }
      │
      ▼
Strapi 全局中间件
  └─ site-resolver (已在 bootstrap 全局挂载)
      ├─ 识别优先级: ?domain > x-site-domain header > host header
      ├─ 查 site-config by domain, populate channels
      └─ ctx.state.siteId = site.documentId
         ctx.state.siteChannelIds = channels.map(c => c.documentId)   [数组]
      │
      ▼
路由 policies
  └─ has-channel-scope (非阻断)
      ├─ 游客分支: 用 siteChannelIds 查 channel.id → channelScope.channelIds
      └─ 登录分支: 用 user 解析 channelScope（不动）
      │
      ▼
controller → service.find(query, channelScope, siteChannelIds)
  └─ 内存过滤 specific 记录: channelIds 与 (siteChannelIds OR userChannelIds) 交集
```

## 组件改动详图

### 1. shao/services/api.ts — 前端统一注入

在 `request()` 的 headers 构造中无条件加入 `x-site-domain`：

```ts
import { BASE_API } from '../utils/env'
import { SITE_DOMAIN } from '../utils/env'   // 新增导入

// request() 内部
const headers: any = {
  'Content-Type': 'application/json',
  'x-site-domain': SITE_DOMAIN,   // 新增：统一注入
  ...options.headers              // 允许调用方覆盖
}
```

**约束**：
- header 位置在 `...options.headers` 之前，允许调用方覆盖（极少需要）
- H5 自动从 `window.location.hostname` 读取；小程序/APP 走 `VITE_SITE_DOMAIN`
- 现有 `wx-jssdk.ts` / `wx-h5-login.ts` / `auth-config.ts` 三处手动 `?domain=` 保留不动（向后兼容，不清理）

### 2. basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts

移除单值 `siteChannelId`，新增数组 `siteChannelIds`：

```ts
// 现状 L52-56
if (Array.isArray(records) && records.length > 0) {
  const site = records[0];
  ctx.state.siteId = site.documentId;
  ctx.state.siteChannelId = (site as any).channels?.[0]?.documentId ?? null;
}

// 改动后
if (Array.isArray(records) && records.length > 0) {
  const site = records[0];
  ctx.state.siteId = site.documentId;
  const channels = Array.isArray((site as any).channels) ? (site as any).channels : [];
  ctx.state.siteChannelIds = channels.map((c: any) => c.documentId).filter(Boolean);
}
```

**约束**：不保留 `siteChannelId` 单值作为兼容 shim（用户规则：拒绝 backwards-compatibility hacks）。

### 3. basic/plugins/zhao-auth/server/src/policies/has-channel-scope.ts

游客分支用 siteChannelIds 填充 channelScope.channelIds：

```ts
// 现状 L28-31
if (!user?.id) {
  policyContext.state.channelScope = { all: false, channelIds: [], isGuest: true };
  return true;
}

// 改动后
if (!user?.id) {
  const siteChannelDocIds: string[] = Array.isArray(policyContext.state?.siteChannelIds)
    ? policyContext.state.siteChannelIds
    : [];
  let guestChannelIds: number[] = [];
  if (siteChannelDocIds.length > 0) {
    try {
      const channels = await strapi.db.query("plugin::zhao-channel.channel").findMany({
        where: { documentId: { $in: siteChannelDocIds } },
        select: ["id"],
      });
      guestChannelIds = channels
        .map((c: any) => c.id)
        .filter((id: any) => typeof id === "number");
    } catch (err) {
      strapi.log.error(`[has-channel-scope] resolve guest channels failed: ${err.message}`);
    }
  }
  policyContext.state.channelScope = { all: false, channelIds: guestChannelIds, isGuest: true };
  return true;
}
```

**约束**：
- `isGuest=true` 标志保留，下游 course.ts / course-category.ts 仍用此标志判断"允许跨渠道"分支
- 登录用户分支不动（channelScope 仍由 user 解析）
- 一次 `findMany` 查全部 documentId，避免 N+1

### 4. basic/plugins/zhao-course/server/src/controllers/course.ts

读取 state 字段名改为数组：

```ts
// 现状 L28-29
const siteChannelId = ctx.state.siteChannelId;
ctx.body = wrapList(await strapi.plugin("zhao-course").service("course").find(ctx.query, publicOnly, channelScope, siteChannelId));

// 改动后
const siteChannelIds = ctx.state.siteChannelIds;
ctx.body = wrapList(await strapi.plugin("zhao-course").service("course").find(ctx.query, publicOnly, channelScope, siteChannelIds));
```

### 5. basic/plugins/zhao-course/server/src/services/course.ts

`find` 第 4 个参数从单值改为数组，过滤逻辑改 `.some` 交集：

```ts
// 现状 L181
async find(query: any = {}, publicOnly: boolean = false, channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean }, siteChannelId?: number | string) {

// 改动后
async find(query: any = {}, publicOnly: boolean = false, channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean }, siteChannelIds?: number[] | string[]) {
```

**改动点 1**（L285 游客分支）：

```ts
// 现状
return siteChannelId != null && courseChannelIds.some(cid => String(cid) === String(siteChannelId));

// 改动后
const siteIds = Array.isArray(siteChannelIds) ? siteChannelIds : [];
return siteIds.some(sid => courseChannelIds.some(cid => String(cid) === String(sid)));
```

**改动点 2**（L300 登录用户分支）：

```ts
// 现状
const matchSite = siteChannelId != null && courseChannelIds.some(cid => String(cid) === String(siteChannelId));

// 改动后
const siteIds = Array.isArray(siteChannelIds) ? siteChannelIds : [];
const matchSite = siteIds.some(sid => courseChannelIds.some(cid => String(cid) === String(sid)));
```

### 6. basic/plugins/zhao-course/tests/admin-course-list.test.ts

测试桩中 `siteChannelId` 单值参数全部改为 `siteChannelIds` 数组：

```
- L70:  siteChannelId=1            → siteChannelIds=[1]
- L89:  siteChannelId=1            → siteChannelIds=[1]
- L65 / L84 注释: "siteChannelId"  → "siteChannelIds"
- 断言逻辑不变（数组交集语义与单值包含等价）
```

## 数据流

### 主流程：c 端游客访问 /zhao-course/v1/course-categories

```
1. 浏览器 (shao/index.vue)
   └─ getCourseCategories() → request('/zhao-course/v1/course-categories')
      headers: { 'x-site-domain': '5.joho.cn' }   ← 前端注入

2. Strapi 路由层
   └─ publicRoute + policies: ['has-channel-scope']
      （site-resolver 中间件已在 bootstrap 全局挂载，先于 policies 执行）

3. site-resolver 中间件
   ├─ ctx.query.domain? 无
   ├─ header['x-site-domain']? '5.joho.cn' ✓
   ├─ extractHost() → '5.joho.cn'
   ├─ 查 site-config { domain: '5.joho.cn' } populate channels
   └─ ctx.state.siteId = site.documentId
      ctx.state.siteChannelIds = ['ch_doc_a', 'ch_doc_b']

4. has-channel-scope 策略
   ├─ 无 user（游客）
   ├─ 读 ctx.state.siteChannelIds = ['ch_doc_a', 'ch_doc_b']
   ├─ db.query('plugin::zhao-channel.channel').findMany({
   │     where: { documentId: { $in: ['ch_doc_a', 'ch_doc_b'] } },
   │     select: ['id']
   │   })
   ├─ 得到 numeric ids = [10, 22]
   └─ ctx.state.channelScope = { all: false, channelIds: [10, 22], isGuest: true }

5. course-category controller → service.find(ctx.query, ctx.state.channelScope)
   ├─ strapi.documents(UID).findMany() 取全部
   └─ 内存过滤：
      ├─ channelScope === "all"                          → 保留
      ├─ channelScope === null                           → 保留（兼容旧数据）
      └─ channelScope === "specific":
         ├─ isGuest=true 且 allowCrossChannel=true       → 保留
         └─ isGuest=true 且 allowCrossChannel=false
            → 检查 category.channelIds 与 [10, 22] 交集
            → 有交集则保留，否则丢弃

6. 响应 → { data: [...], meta: { pagination } }
```

### 边界场景

| 场景 | site-resolver 输入 | siteChannelIds | channelScope.channelIds | 过滤结果 |
|---|---|---|---|---|
| H5 正常域名（5.joho.cn） | header `x-site-domain` | `['ch_a','ch_b']` | `[10, 22]` | 按 10/22 过滤 specific |
| H5 localhost 开发 | header `x-site-domain: localhost` | 找不到 site-config → `[]` | `[]` | 只剩 all + allowCrossChannel |
| 小程序生产 | header `x-site-domain: 5.joho.cn` | 同上 | `[10, 22]` | 同 H5 正常 |
| 未识别租户（域名未配） | header 域名未在 DB | `[]` | `[]` | all + allowCrossChannel |
| 站点未关联渠道 | 找到 site 但 channels=[] | `[]` | `[]` | all + allowCrossChannel |
| 登录用户访问 | header + token | has-channel-scope 走 user 路径 | user.channelIds | OR 站点渠道 / 用户渠道 |
| admin 访问 | header + token | has-channel-scope.all=true | `[]`（all=true 无限制） | 全部可见 |

### 登录用户路径

```
has-channel-scope:
  user.id 存在 → channelScope = resolve(user)  // 不查 siteChannelIds
  ↓
course.ts find():
  isGuest=false → 走 L289-303 分支
  siteChannelIds 仍从 ctx.state 传入（控制器读取）
  过滤: allowCrossChannel=true OR 与 siteChannelIds 交集 OR 与 userChannelIds 交集
```

**关键**：登录用户路径下，has-channel-scope 不会用 siteChannelIds 覆盖 channelScope（channelScope 仍是用户自己的）；siteChannelIds 作为独立参数传给 service，service 用 OR 逻辑同时检查"站点渠道"和"用户渠道"。

## 错误处理

**原则**：站点解析失败不阻塞请求，降级为"无租户"行为；DB 查询失败记录日志并放行（避免单点故障）。

| 故障点 | 处理 | 用户可见 |
|---|---|---|
| 前端 `SITE_DOMAIN` 为空（小程序未配 VITE_SITE_DOMAIN） | header 为空字符串 → site-resolver 跳过域名识别 → siteChannelIds=[] | 只看到 all + allowCrossChannel 数据 |
| site-resolver 查 site-config 抛异常 | try/catch 已有（L58-60），记录日志，siteChannelIds 保持 undefined | 同上 |
| has-channel-scope 查 channel documentId→id 抛异常 | try/catch 包裹，guestChannelIds=[]，记录日志 | 只看到 all + allowCrossChannel 数据 |
| site-config.channels 为空数组 | siteChannelIds=[]，channelIds=[]，specific 分类全部过滤掉 | 首页只显示全渠道分类 |
| 站点域名匹配但渠道 documentId 在 channel 表查不到（脏数据） | 该 documentId 静默丢弃，channelIds 只包含匹配到的 | 部分分类可能漏显示 |

**不处理的场景**（YAGNI）：
- 前端 header 被中间人篡改 → 后端 site-resolver 校验 domain 在 DB 存在性，未匹配自动降级
- 多个 site-config 同 domain → schema 已 unique 约束
- channel 表 documentId 重复 → Strapi 自身约束

## 测试策略

### 1. 单元测试 — has-channel-scope 策略（新增）

`basic/plugins/zhao-auth/tests/has-channel-scope.test.ts`：

```
- 游客 + siteChannelIds=['doc_a','doc_b'] → channelScope.channelIds=[10,22], isGuest=true
- 游客 + siteChannelIds=[]                → channelScope.channelIds=[],     isGuest=true
- 游客 + siteChannelIds=undefined         → channelScope.channelIds=[],     isGuest=true
- 登录用户 admin                          → channelScope.all=true（不查 siteChannelIds）
- 登录用户普通                            → channelScope.channelIds=userChannelIds（不查 siteChannelIds）
- DB 查询抛异常                           → channelScope.channelIds=[], isGuest=true, 不抛错
```

### 2. 集成测试 — site-resolver 中间件（新增）

`basic/plugins/zhao-common/tests/site-resolver.test.ts`：

```
- header x-site-domain='5.joho.cn' + site-config 关联 2 渠道 → siteChannelIds=['doc_a','doc_b']
- header x-site-domain='5.joho.cn' + site-config.channels=[] → siteChannelIds=[]
- header x-site-domain='unknown.com'                          → siteChannelIds=undefined
- query.domain 优先级高于 header
```

### 3. 集成测试 — course-category.find 游客过滤（新增）

`basic/plugins/zhao-course/tests/course-category-guest.test.ts`：

```
- 游客 + channelScope.channelIds=[10,22]
  + specific allowCrossChannel=false + channelIds=[10]  → 保留
  + specific allowCrossChannel=false + channelIds=[33]  → 丢弃
  + specific allowCrossChannel=true                     → 保留
  + all                                                  → 保留
```

### 4. 修复现有测试 — admin-course-list.test.ts

```
- L70: siteChannelId=1 → siteChannelIds=[1]
- L89: siteChannelId=1 → siteChannelIds=[1]
- L65 / L84 注释: "siteChannelId" → "siteChannelIds"
- 断言逻辑不变（数组交集语义与单值包含等价）
```

### 5. 手工端到端验证

- shao 端 H5 在 `5.joho.cn` 访问首页 → course-categories 返回该站点渠道下的分类
- shao 端 H5 在 `localhost` 访问 → 只返回 all + allowCrossChannel 分类
- 后台 admin 在 `/admin` 修改某站点关联渠道 → shao 端刷新首页，分类列表变化
- shao 端登录用户访问 → 看到站点渠道 OR 用户归属渠道的分类

### 不测试的部分

- 前端 `request()` header 注入 — 无业务逻辑，开浏览器 DevTools 即可验证
- site-resolver 三阶段 fallback — 已有逻辑，本次仅扩展字段，不改 fallback 顺序

## "不保留单值"约束

**约束**：移除 `ctx.state.siteChannelId`（单值），不保留作为兼容 shim，所有引用处一并迁移到 `siteChannelIds`（数组）。

**理由**：

1. **避免双轨制腐化**：若同时保留 `siteChannelId` 和 `siteChannelIds`，下游代码可能混用（有的用单值，有的用数组），未来维护时需要时刻判断"这个上下文用的是哪种"，违反"代码只做实现，拒绝冗余"原则
2. **影响范围可控**：通过 Grep 已确认 `siteChannelId` 的全部引用仅 4 处（site-resolver 设置 + course controller 读取 + course service 参数 + 测试桩），改动面小，无第三方依赖
3. **架构约束进规则，不进代码**：约束是"站点可能多渠道"，这个事实应直接体现在 state 字段为数组类型，而不是用单值字段暗示"一个站点一个渠道"的错误假设
4. **用户规则明示**：用户规则要求"拒绝 backwards-compatibility hacks（重命名 _vars、re-export types、// removed 注释等）"——保留单值作为兼容正是这种被禁止的 hack

**例外**：`has-tenant-access.ts` L62-83 内部用局部变量 `siteChannelIds`（已是数组），不依赖 `ctx.state.siteChannelId`，无需改动。

**风险与缓解**：
- 风险：若有未发现的引用点（如其他插件、未提交的代码）使用 `ctx.state.siteChannelId`，会变成 undefined
- 缓解：实施阶段先全量 Grep 一遍 `siteChannelId` 确认无遗漏，再开始改
