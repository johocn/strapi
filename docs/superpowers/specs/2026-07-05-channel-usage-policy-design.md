# 租户渠道使用范围策略设计

> **日期**: 2026-07-05
> **主题**: 在 zhao-common 提取可复用策略 resolve-channel-scope，统一 courses / course-categories 的渠道过滤逻辑，并在 site-config 增加租户级 channelUsage 配置三档控制

## 1. 背景与问题

### 1.1 当前规则不一致

| 接口 | 跨渠道 | 站点渠道 | 个人渠道 |
|---|---|---|---|
| `/v1/courses` | ✅ | ✅ | ✅ |
| `/v1/course-categories` | ✅ | ❌ 缺失 | ✅ |

[course-category service](file:///e:/code/basic/plugins/zhao-course/server/src/services/course-category.ts) 的 `find` 仅用 `channelScope.channelIds`（用户个人渠道并集），**站点渠道未参与过滤**，导致登录用户在跨渠道分类站点看不到站点渠道独有分类。

### 1.2 隐藏 bug

[site-resolver.ts:55](file:///e:/code/basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts#L55) 注入 `ctx.state.siteChannelId` 只取 `site-config.channels[0].documentId`（单值），站点多渠道时遗漏。

### 1.3 缺少租户级开关

不同租户对"渠道使用范围"诉求不同：
- 严格租户：仅允许站点渠道，屏蔽跨渠道与个人渠道
- 标准租户：站点 + 跨渠道
- 开放租户：站点 + 跨渠道 + 个人（当前默认行为）

当前无此配置，所有租户行为耦合在代码里。

## 2. 目标

1. 在 `site-config` 增加 `channelUsage` 枚举字段，三档控制
2. 在 `zhao-common` 新增可复用策略 `resolve-channel-scope`，统一注入合并渠道状态
3. `courses` / `course-categories` 公开路由共用同一过滤公式
4. site_only 模式下，C 端过滤屏蔽跨渠道数据，管理端拒绝保存 `allowCrossChannel=true`
5. 顺手修复 `siteChannelId` 单值 → 数组化

## 3. 不改动范围（YAGNI）

- 课时（course-lesson）：无独立 `allowCrossChannel` 字段，跟随课程
- 自提点（pickup-location）：无 `allowCrossChannel` 字段，保持现状
- 管理员路由（admin/*）：admin 走 isAdmin 分支，不受策略影响
- `my/*` 用户路由：不动
- 性能优化、Redis 缓存：本次不做

## 4. 架构

```
请求 → tenant-context-resolver → site-resolver
     → has-channel-scope (注入 channelScope)
     → resolve-channel-scope (注入 channelUsage/mergedChannelIds/crossChannelEnabled/siteChannelIds)
     → Controller → Service (统一过滤公式)
```

策略非阻断，仅做状态注入；具体过滤由 service 完成。

## 5. site-config schema 变更

### 5.1 新增字段

```json
"channelUsage": {
  "type": "enumeration",
  "enum": ["site_only", "site_and_cross", "site_cross_user"],
  "default": "site_cross_user",
  "required": true
}
```

### 5.2 三档语义

| 值 | crossChannelEnabled | mergedChannelIds | 业务含义 |
|---|---|---|---|
| `site_only` | false | siteChannelIds | 仅全渠道 + 站点渠道，屏蔽跨渠道与个人渠道 |
| `site_and_cross` | true | siteChannelIds | 全渠道 + 跨渠道 + 站点渠道 |
| `site_cross_user` | true | siteChannelIds ∪ userChannelIds | 全渠道 + 跨渠道 + 站点 + 个人（默认） |

### 5.3 数据迁移

- 文件：`basic/plugins/zhao-common/server/database/migrations/001_add_channel_usage.js`
- 由 zhao-common bootstrap 触发执行
- 现有记录自动补 `channelUsage = 'site_cross_user'`（与当前 courses 行为一致，零回归）
- 重复执行兼容（检查列是否存在）

### 5.4 兼容性

- `channelUsage` 为 required，migration 后所有记录都有值
- 读取到 null/undefined 时 fallback 到 `site_cross_user`

## 6. 策略 `resolve-channel-scope` 实现

### 6.1 文件位置

`basic/plugins/zhao-common/server/src/policies/resolve-channel-scope.ts`

### 6.2 接口

```ts
const resolveChannelScope = async (policyContext, config, { strapi }) => {
  // 非阻断，永远 return true
  // 仅注入 ctx.state.* 字段
}
```

### 6.3 执行流程

1. **读取 siteId**（来自 site-resolver 中间件）
   - 无 siteId：注入默认值（`site_cross_user`，mergedChannelIds=userChannelIds，crossChannelEnabled=true，siteChannelIds=[]）后 return

2. **查询 site-config**
   ```ts
   strapi.db.query('plugin::zhao-common.site-config').findOne({
     where: { documentId: siteId },
     select: ['channelUsage'],
     populate: { channels: { select: ['id'] } },
   })
   ```
   - `siteChannelIds = siteConfig.channels.map(c => c.id)`
   - `channelUsage = siteConfig.channelUsage || 'site_cross_user'`

3. **读取用户渠道**（来自 has-channel-scope 注入的 `ctx.state.channelScope`）
   - admin（`channelScope.all=true`）：userChannelIds=[]
   - 其他：userChannelIds=channelScope.channelIds||[]

4. **计算 mergedChannelIds**
   - `site_only`: mergedChannelIds = siteChannelIds
   - `site_and_cross`: mergedChannelIds = siteChannelIds
   - `site_cross_user`: mergedChannelIds = siteChannelIds ∪ userChannelIds（去重）
   - admin：mergedChannelIds 不变（service 走 isAdmin 分支不读 merged）

5. **计算 crossChannelEnabled**
   - `crossChannelEnabled = (channelUsage !== 'site_only')`

6. **注入 ctx.state**
   - `channelUsage`、`mergedChannelIds`、`crossChannelEnabled`、`siteChannelIds`、`isGuest`

### 6.4 关键设计点

- 非阻断，仅注入状态
- 必须在 `has-channel-scope` 之后挂载
- site-config 查询失败、channelScope 缺失时 fallback 到默认值，不抛错
- 暂不做 Redis 缓存（与 has-tenant-access-loose 一致）

### 6.5 注册

`basic/plugins/zhao-common/server/src/policies/index.ts`：
```ts
import resolveChannelScope from "./resolve-channel-scope";

export default {
  "has-tenant-access-loose": hasTenantAccessLoose,
  "has-tenant-access-strict": hasTenantAccessStrict,
  "resolve-channel-scope": resolveChannelScope,
};
```

## 7. 路由配置变更

### 7.1 新增路由变体

`basic/plugins/zhao-course/server/src/routes/content-api.ts`：

```ts
const publicChannelScopeRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-common.resolve-channel-scope",
    ],
  },
});
```

### 7.2 路由替换

| 原路由 | 新路由 |
|---|---|
| `publicRoute("GET", "/courses", "course.find")` | `publicChannelScopeRoute(...)` |
| `publicRoute("GET", "/courses/:documentId", "course.findOne")` | `publicChannelScopeRoute(...)` |
| `publicRoute("GET", "/course-categories", "course-category.find")` | `publicChannelScopeRoute(...)` |
| `publicRoute("GET", "/course-categories/:documentId", "course-category.findOne")` | `publicChannelScopeRoute(...)` |

### 7.3 不变动

- `course-lessons` / `lessons` 公开路由保持 `publicRoute`（课时跟随课程）
- 管理员路由（`channelScopeRoute`）保持原样
- `my/*` 用户路由保持原样

### 7.4 插件加载顺序

需确认 zhao-common 先于 zhao-course 加载（若未声明依赖，在 plan 中验证）。

## 8. service 层改动

### 8.1 统一过滤公式

```
record 可见 =
  (channelScope === 'all')
  || (crossChannelEnabled && allowCrossChannel === true)
  || (channelScope === 'specific'
      && (channelIds ∩ mergedChannelIds 非空))

其中 mergedChannelIds:
  - site_only:        siteChannelIds
  - site_and_cross:   siteChannelIds
  - site_cross_user:  siteChannelIds ∪ userChannelIds（游客无 userChannelIds）

crossChannelEnabled:
  - site_only:        false
  - site_and_cross:   true
  - site_cross_user:  true
```

`channelScope=all` 始终可见（公共资源豁免），不受 `crossChannelEnabled` 影响。

### 8.2 site_only 行为表

| 场景 | site_only 可见性 |
|---|---|
| `channelScope=all` | ✅ 可见 |
| `specific` + `allowCrossChannel=true` | ❌ 不可见（跨渠道屏蔽） |
| `specific` + `channelIds ∩ siteChannelIds 非空` | ✅ 可见 |
| `specific` + `channelIds` 仅含个人渠道 | ❌ 不可见 |
| `specific` + `channelIds` 与站点无交集 | ❌ 不可见 |

### 8.3 course-category service

文件：`basic/plugins/zhao-course/server/src/services/course-category.ts`

新签名：
```ts
async find(query, ctxState: {
  channelScope?: { all, channelIds, isGuest };
  mergedChannelIds: number[];
  siteChannelIds: number[];
  crossChannelEnabled: boolean;
})
```

过滤逻辑（替换第 34-59 行）：
```ts
const isGuest = !channelScope || channelScope.isGuest
  || (!channelScope.all && !channelScope.channelIds?.length);

const mergedIds = crossChannelEnabled
  ? (isGuest ? siteChannelIds : mergedChannelIds)
  : siteChannelIds;

filteredList = list.filter((category) => {
  if (category.channelScope === "all") return true;
  if (category.channelScope === null) return true;
  if (category.channelScope === "specific") {
    if (crossChannelEnabled && category.allowCrossChannel === true) return true;
    const categoryChannelIds = category.channelIds || [];
    return categoryChannelIds.some((cid) =>
      mergedIds.some((mid) => String(mid) === String(cid))
    );
  }
  return false;
});
```

### 8.4 course service

文件：`basic/plugins/zhao-course/server/src/services/course.ts`

新签名：
```ts
async find(query, publicOnly, ctxState: {
  channelScope?: { all, channelIds, isGuest };
  mergedChannelIds: number[];
  siteChannelIds: number[];
  crossChannelEnabled: boolean;
})
```

改动点：
1. 删除 `siteChannelId` 单值参数，改用 `siteChannelIds` 数组
2. 第 276-304 行过滤逻辑统一为公式
3. admin 分支（`isAdmin`）保持不变

### 8.5 controller 改动

[course.ts controller](file:///e:/code/basic/plugins/zhao-course/server/src/controllers/course.ts) 第 21-34 行：
```ts
async find(ctx) {
  const isAdmin = ctx.path?.includes("/admin/") ?? false;
  const publicOnly = !isAdmin;
  const channelScope = ctx.state.channelScope
    || (publicOnly ? { all: true, channelIds: [], isGuest: true } : { all: true, channelIds: [], isGuest: false });

  ctx.body = wrapList(await strapi.plugin("zhao-course").service("course").find(ctx.query, publicOnly, {
    channelScope,
    mergedChannelIds: ctx.state.mergedChannelIds || [],
    siteChannelIds: ctx.state.siteChannelIds || [],
    crossChannelEnabled: ctx.state.crossChannelEnabled ?? true,
  }));
}
```

course-category controller 同步改动。

### 8.6 findOne 改动

- `course.findOne` 的 `checkCourseAccess` 改用 `mergedChannelIds` 替代 `userChannelIds`
- `course-category.findOne` 同步改用 `mergedChannelIds`

## 9. 管理端校验（C 端 + 管理端均限制）

### 9.1 校验位置

[course service 的 `validateChannelConfig`](file:///e:/code/basic/plugins/zhao-course/server/src/services/course.ts#L27-L69) 追加跨渠道校验。

### 9.2 校验逻辑

```ts
async function validateChannelConfig(data, strapi, siteId) {
  // ... 现有 channelScope/channelIds/pointChannel 校验保持不变 ...

  if (data.allowCrossChannel === true) {
    const channelUsage = await getSiteChannelUsage(strapi, siteId);
    if (channelUsage === 'site_only') {
      const err: any = new Error('当前租户未开启跨渠道功能，不允许设置 allowCrossChannel=true');
      err.code = 'COURSE_003';
      err.status = 400;
      throw err;
    }
  }
}

async function getSiteChannelUsage(strapi, siteId?: string): Promise<string> {
  if (!siteId) return 'site_cross_user';
  const site = await strapi.db.query('plugin::zhao-common.site-config').findOne({
    where: { documentId: siteId },
    select: ['channelUsage'],
  });
  return site?.channelUsage || 'site_cross_user';
}
```

### 9.3 siteId 传递

- `course.create` / `course.update` controller 读取 `ctx.state.siteId` 传入 service
- service 透传给 `validateChannelConfig`

### 9.4 course-category 同步

course-category service 的 `create` / `update` 加同样校验。

### 9.5 已存在数据

- site_only 租户下已存在的 `allowCrossChannel=true` 数据：管理端可编辑（保存时若不改该字段则不触发校验），C 端过滤时被屏蔽
- 自提点无 `allowCrossChannel` 字段，无需校验
- 课时无独立 `allowCrossChannel` 字段，跟随课程

### 9.6 错误码

- `COURSE_003`：当前租户未开启跨渠道功能

## 10. site-resolver 修复

### 10.1 改动

[site-resolver.ts:55](file:///e:/code/basic/plugins/zhao-common/server/src/middlewares/site-resolver.ts#L55) 删除：
```ts
ctx.state.siteChannelId = (site as any).channels?.[0]?.documentId ?? null;
```

### 10.2 替代

由 `resolve-channel-scope` 策略统一注入 `ctx.state.siteChannelIds`（number[]）。

### 10.3 兼容性

- course service 改用 `siteChannelIds` 数组，无遗留 `siteChannelId` 单值引用
- 已有 site-config 数据 migration 自动补默认值

## 11. 影响范围

| 文件 | 改动 |
|---|---|
| `zhao-common/server/src/content-types/site-config/schema.json` | 加 channelUsage 字段 |
| `zhao-common/server/src/content-types/site-config/index.ts` | 若内联 schema，同步更新 |
| `zhao-common/server/src/policies/resolve-channel-scope.ts` | 新增 |
| `zhao-common/server/src/policies/index.ts` | 注册新策略 |
| `zhao-common/server/src/middlewares/site-resolver.ts` | 删除第 55 行 |
| `zhao-common/server/database/migrations/001_add_channel_usage.js` | 新增 |
| `zhao-course/server/src/routes/content-api.ts` | 新增 publicChannelScopeRoute，替换 4 个路由 |
| `zhao-course/server/src/services/course.ts` | find 签名 + 过滤逻辑 + validateChannelConfig |
| `zhao-course/server/src/services/course-category.ts` | find 签名 + 过滤逻辑 + create/update 校验 |
| `zhao-course/server/src/controllers/course.ts` | find/findOne 改用 ctx.state |
| `zhao-course/server/src/controllers/course-category.ts` | find/findOne 改用 ctx.state |

## 12. 测试

### 12.1 单元测试

#### `resolve-channel-scope` 策略测试
- site_only / site_and_cross / site_cross_user 三档
- 登录用户 vs 游客
- admin 用户
- 无 siteId fallback
- 查询失败 fallback

#### course service 过滤测试矩阵

| channelUsage | 用户类型 | record.channelScope | record.allowCrossChannel | record.channelIds | 期望 |
|---|---|---|---|---|---|
| site_only | 登录 | all | - | - | 可见 |
| site_only | 登录 | specific | true | [个人渠道] | 不可见 |
| site_only | 登录 | specific | false | [站点渠道] | 可见 |
| site_only | 登录 | specific | false | [个人渠道] | 不可见 |
| site_and_cross | 登录 | specific | true | [任意] | 可见 |
| site_and_cross | 登录 | specific | false | [个人渠道] | 不可见 |
| site_cross_user | 登录 | specific | false | [个人渠道] | 可见 |
| site_cross_user | 游客 | specific | false | [站点渠道] | 可见 |
| site_cross_user | 游客 | specific | false | [个人渠道] | 不可见 |

#### 管理端校验测试
- site_only 租户创建 allowCrossChannel=true → COURSE_003
- site_cross_user 租户创建 allowCrossChannel=true → 成功
- site_only 租户更新（不改 allowCrossChannel）→ 成功

### 12.2 集成测试（手动）

```bash
# 1. 设置租户 channelUsage=site_only
curl -X PUT http://localhost:1337/api/zhao-common/v1/admin/site-configs/<docId> \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"data":{"channelUsage":"site_only"}}'

# 2. 用普通用户 token 请求分类列表
curl http://localhost:1337/api/zhao-course/v1/course-categories \
  -H "Authorization: Bearer <user-token>"

# 期望：仅返回 channelScope=all + specific 且 channelIds 含站点渠道 的分类

# 3. 切换为 site_cross_user
# 4. 再次请求，期望返回更多分类（含个人渠道 + 跨渠道）
```

### 12.3 回归

- [zhao-course 现有测试](file:///e:/code/basic/plugins/zhao-course/tests/admin-course-list.test.ts) 必须通过
- `/v1/courses` 在 `site_cross_user`（默认）下行为与当前一致

## 13. 风险点

1. **插件加载顺序**：zhao-common 必须先于 zhao-course 加载，否则策略注册不到。需在 plan 中验证 Strapi 加载机制
2. **schema 与 index.ts 双写**：site-config schema 若在 index.ts 内联，需同步更新（参考 project_memory 约定）
3. **migration 幂等性**：重复执行不能报错（检查列是否存在）
4. **前端管理界面**：channelUsage 字段编辑由前端另行实现，本次只保证 API 支持
