# 租户列表页 + C 端 public/config 修复设计

- **日期**: 2026-07-23
- **范围**: `plugins/zhao-auth`、`plugins/zhao-common`、`strapi-backend`（前端 uni-app 页面）
- **状态**: 已批准，待生成实现计划

## 1. 问题边界

用户报告两类现象，根因共 3 个相互关联的 bug：

| # | 现象 | 根因 |
|---|---|---|
| B1 | 租户列表页 `/pages/tenant/list` 状态永远"已停用"、标签全灰、更新时间显示"-"、名称显示"未命名租户" | 后端 `GET /zhao-auth/v1/my/tenants` 只 `select: ["id","documentId","siteName","domain"]` 并把 `siteName` 重命名为 `name`，未 populate 关系，前端依赖的 `featureFlags/updatedAt/channels/template` 全部缺失 |
| B2 | C 端 `GET /api/zhao-common/v1/public/config?domain=localhost` 返回 `site` 全空字符串（应返回"圣麟教育"） | `controllers/config.ts:849` 把 `ctx.state.siteId`（数字主键）当作 `documentId`（字符串）传给 `getPublicConfig` → `site-config.ts:33` 用 `findOne({ documentId: 1 })` 查询，永远查不到记录，返回 `DEFAULT_CONFIG` 空字符串 |
| B3 | 同接口 `moduleGrantedForCurrentTenant` 13 个模块全 false + `moduleVisibility` 未合并租户覆盖 | 同一类型错位的两个衍生点：(a) `config.ts:500` 用数字 `siteId` 与 `moduleTenantGrants[key]`（documentId 字符串数组）比对，`includes(1)` 恒为 false；(b) `config.ts:514` 调用 `resolveModuleVisibility(siteId)` 传的也是数字 id，但该函数签名要求 `tenantDocumentId`（documentId 字符串） |

附带问题：种子记录"圣麟教育"创建时 `domain` 字段为空（`bootstrap.ts:8-77` 的 `DEFAULT_SITE_CONFIG` 未定义 `domain`），`?domain=localhost` 精确匹配也命中不了 → 需要 domain 回退逻辑。

### 1.1 关键约束（自审发现，避免破坏其他模块）

全局检索 `ctx.state.siteId` 使用情况发现：**30+ 个控制器（logistics/website/studio/third/course 等）都正确使用 `ctx.state.siteId`（数字 id）做 `db.query` 关系过滤**，这是正确的用法，不能动。

**只有 `controllers/config.ts:849` 这一处误用**——它把数字 id 传给需要 documentId 的 `getPublicConfig`。修复方向是改这一处消费方（读 `siteDocumentId` 而非 `siteId`），而非改中间件写入语义。

同理，`config.ts:500` 和 `config.ts:514` 都是 `getPublicConfig` 内部的衍生误用，随参数语义修正一并解决。

### 1.2 已确认的代码事实

- `tenant.service.ts` 用的是 `strapi.db.query`（非 documentService），`select` **不会自动返回时间戳**，需显式 `select: [..., "updatedAt", "createdAt"]`
- 非 admin 分支与 admin 分支查询路径完全不同：先 `strapi.db.connection("zhao_channels_sites_lnk")` 查关联表拿数字 id，再 `db.query` 按 `id $in` 查
- `resolveModuleVisibility(tenantDocumentId)` 签名要求 documentId 字符串（见 `permission.service.ts:486`）
- `role-management.service.ts` 多处注释明确"来自 `ctx.state.siteDocumentId`"，证明项目已约定两个字段分工

## 2. 修复原则

1. **类型错位是 B2/B3 共同根因**：统一用 `ctx.state.siteDocumentId`（字符串）替换对 `ctx.state.siteId`（数字）的误用，一处修复同时解决两个问题
2. **domain 回退规则**：domain 匹配不到时回退到默认站点（`zhao_site_configs` 表 id 最小记录），但回退后必须取到真实 site-config 记录（含 siteName="圣麟教育"），不能返回空默认值
3. **B1 是后端字段不全问题**：修后端 `tenant.service.ts` 的 `select`/`populate`，前端仅适配字段名，不动 UI 结构
4. **不动** schema、不引入独立 status 字段、不处理 `thirdPartyConfigs`（schema 无此字段，显示 0 可接受）

## 3. B1 租户列表后端字段修复

### 3.1 当前问题

`d:\zhao\strapi\plugins\zhao-auth\server\src\services\tenant.service.ts` 两个分支都只 `select: ["id","documentId","siteName","domain"]`，并把 `siteName` 重命名为 `name`，未 populate 关系，未 select 时间戳。

**注意**：两个分支查询路径完全不同：
- **admin 分支**（第 9-18 行）：直接 `strapi.db.query(SITE_CONFIG_UID).findMany` 全表查
- **非 admin 分支**（第 22-61 行）：先 `strapi.db.connection("zhao_channels_sites_lnk").whereIn("channel_id", channelIds)` 查关联表拿数字 site id，再 `strapi.db.query(SITE_CONFIG_UID).findMany({ where: { id: { $in: siteIds } } })` 查租户详情

两分支都用 `strapi.db.query`（非 documentService），**`select` 不会自动返回时间戳**，需显式加 `updatedAt`。

### 3.2 修复方案

**文件**：`d:\zhao\strapi\plugins\zhao-auth\server\src\services\tenant.service.ts`

由于 `strapi.db.query` 的 `populate` 语法与 documentService 不同（用对象形式），且 channels 是 manyToMany 关系，需用 `populate: { channels: true, template: { select: ["name"] } }`。

**admin 分支**（第 9-18 行）改造：

```typescript
const all = await strapi.db.query(SITE_CONFIG_UID).findMany({
  select: ["id", "documentId", "siteName", "domain", "featureFlags", "updatedAt"],
  populate: {
    channels: { select: ["id"] },            // manyToMany, 仅需 id 算 length
    template: { select: ["name"] },           // manyToOne, 仅需 name
  },
  limit: 1000,
});
return all.map((s: any) => ({
  id: s.id,
  documentId: s.documentId,
  siteName: s.siteName,                       // 不再重命名为 name
  domain: s.domain,
  featureFlags: s.featureFlags ?? {},         // 状态 + 标签数据源
  channelsCount: (s.channels ?? []).length,
  templateName: s.template?.name ?? null,
  updatedAt: s.updatedAt,                     // 显式 select 才有值
}));
```

**非 admin 分支**（第 50-61 行）改造（仅改 `select` 和 `populate`，`where` 条件不变）：

```typescript
const sites = await strapi.db.query(SITE_CONFIG_UID).findMany({
  where: { id: { $in: siteIds } },
  select: ["id", "documentId", "siteName", "domain", "featureFlags", "updatedAt"],
  populate: {
    channels: { select: ["id"] },
    template: { select: ["name"] },
  },
});
return sites.map((s: any) => ({
  id: s.id,
  documentId: s.documentId,
  siteName: s.siteName,
  domain: s.domain,
  featureFlags: s.featureFlags ?? {},
  channelsCount: (s.channels ?? []).length,
  templateName: s.template?.name ?? null,
  updatedAt: s.updatedAt,
}));
```

### 3.3 字段映射对照（修复后）

| 前端 list.vue 使用字段 | 后端返回字段 | 状态 |
|---|---|---|
| `tenant.siteName` | `siteName` | 修复（不再重命名） |
| `tenant.featureFlags?.channel` | `featureFlags.channel` | 修复 |
| `tenant.featureFlags?.[key]`（标签） | `featureFlags[key]` | 修复 |
| `tenant.updatedAt` | `updatedAt` | 修复（显式 select） |
| `tenant.channels?.length` | `channelsCount` | 字段名变化 |
| `tenant.template?.name` | `templateName` | 字段名扁平化 |
| `tenant.thirdPartyConfigs?.length` | 不返回 | 显示 0（可接受） |
| `tenant.documentId` | `documentId` | 不变 |
| `tenant.domain` | `domain` | 不变 |

### 3.4 前端适配

**文件**：`d:\zhao\strapi-backend\pages\tenant\list.vue`

仅改 2 处字段引用（不改 UI 结构、不改样式）：
- 第 37 行：`tenant.channels?.length` → `tenant.channelsCount`
- 第 45 行：`tenant.template?.name` → `tenant.templateName`

### 3.5 设计决策

1. **用 `channelsCount` 而非完整 `channels` 数组**：列表只需数量，避免传输完整关联对象（减少响应体积、避免权限泄漏）
2. **用 `templateName` 而非 `template` 对象**：同上，列表只需名称
3. **`featureFlags` 返回完整对象**：前端需要 7 个子键判断标签状态，扁平化反而更复杂，保留原对象
4. **不返回 `thirdPartyConfigs`**：schema 无此字段，前端 `?.length` 已安全降级为 0，不破坏 UI
5. **保持 `strapi.db.query` 而非改用 documentService**：非 admin 分支依赖 `where: { id: { $in: siteIds } }` 按数字 id 过滤，documentService 只支持 documentId 过滤，改用会破坏查询逻辑；admin 分支为保持一致性也用 db.query

## 4. B2/B3 siteId 类型错位 + domain 回退

### 4.1 当前问题

两个中间件都写 `ctx.state.siteId = site.id`（数字），但 `controllers/config.ts:849` 把它当 documentId 传给 `findOne({ documentId: siteId })` → 永远查不到 → 返回 `DEFAULT_CONFIG` 空字符串。

### 4.2 修复点 1：中间件字段写入语义（不改）

**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\middlewares\site-resolver.ts`（第 55-56 行）
**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\middlewares\tenant-context-resolver.ts`（第 32 行）

两个中间件已正确写入两个字段，语义明确，**字段写入逻辑不改**：
```typescript
ctx.state.siteId = site.id;                      // 数字主键（供 db.query 关系过滤用）
ctx.state.siteDocumentId = site.documentId;      // 字符串 documentId（供 documentService 查询）
```

> 注意：site-resolver.ts 文件本身会在修复点 5（第 4.6 节）新增 domain 回退分支，但字段写入语义不变。问题在于消费方（config.ts:849）误用了 `siteId`（数字）当 documentId，需在修复点 2/3 修正消费方。

### 4.3 修复点 2：控制器读取 documentId

**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\controllers\config.ts`（第 847-858 行 `getPublic`）

```typescript
async getPublic(ctx: any) {
  try {
    const siteDocId = ctx.state?.siteDocumentId;   // 改：读 documentId 字符串
    const channelId = ctx.query.channel || ctx.state?.channelId;
    const service = strapi.plugin("zhao-common").service("config");
    const data = await service.getPublicConfig(siteDocId, channelId);  // 传 documentId
    ctx.body = { data };
  } catch (error: any) { ... }
}
```

### 4.4 修复点 3：服务层接收 documentId

**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\services\config.ts`

`getPublicConfig` 内部有 **3 处**衍生误用，全部随参数语义从 `siteId`（数字）改为 `siteDocId`（documentId 字符串）一并修正：

| 行号 | 当前代码 | 修复后 |
|---|---|---|
| 246 | `async getPublicConfig(siteId, channelId)` | `async getPublicConfig(siteDocId, channelId)` |
| 255 | `siteConfigService.getConfig(siteId)` | `siteConfigService.getConfig(siteDocId)` |
| 500 | `const currentTenantDocId = siteId ?? ""` | `const currentTenantDocId = siteDocId ?? ""` |
| 514 | `resolveModuleVisibility(siteId)` | `resolveModuleVisibility(siteDocId)` |

**关键**：第 514 行 `resolveModuleVisibility` 签名要求 `tenantDocumentId: string`（见 `permission.service.ts:486`），当前传数字 id 导致租户级 moduleVisibility 覆盖永远不生效（查不到租户配置就回退全局默认）。这是设计中原本遗漏的第 4 处修复点，自审时发现。

### 4.5 修复点 4：site-config 服务查询语义（不改）

**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\services\site-config.ts`（第 30-36 行）

服务层代码不变（它本来就是按 documentId 查的），是上游传错了类型，现在类型对了自然查得到。

### 4.6 修复点 5：domain 回退到默认站点

**文件**：`d:\zhao\strapi\plugins\zhao-common\server\src\middlewares\site-resolver.ts`（第 44-58 行）

当前逻辑：domain 匹配不到 → `ctx.state.siteId` 不被设置 → 控制器拿到 `undefined` → 返回空默认值。

修复后：domain 匹配不到 → 回退到默认站点（`zhao_site_configs` 表 id 最小的一条）→ 写入 `ctx.state.siteId` + `ctx.state.siteDocumentId` → 控制器用 documentId 查询能取到"圣麟教育"真实数据。

```typescript
if (domain) {
  const records = await strapi.documents(SITE_CONFIG_UID).findMany({
    filters: { domain },
    populate: ["channels", "template"],
    limit: 1,
  });
  if (Array.isArray(records) && records.length > 0) {
    const site = records[0];
    ctx.state.siteId = site.id;
    ctx.state.siteDocumentId = site.documentId;
    return next();
  }
  // domain 未匹配 → 回退到默认站点
  strapi.log.warn(`[site-resolver] domain "${domain}" 未匹配，回退到默认站点`);
}

// 回退：取 id 最小的站点作为默认（bootstrap 种子记录 id=1，即"圣麟教育"）
const fallback = await strapi.documents(SITE_CONFIG_UID).findMany({
  sort: { id: "asc" },
  limit: 1,
  populate: ["channels", "template"],
});
if (Array.isArray(fallback) && fallback.length > 0) {
  const site = fallback[0];
  ctx.state.siteId = site.id;
  ctx.state.siteDocumentId = site.documentId;
}
return next();
```

### 4.7 设计决策

1. **回退取 `id asc limit 1`**：bootstrap 种子创建的第一条就是"圣麟教育"，符合"默认站点"语义；不依赖 documentId 排序（documentId 是随机字符串无序）
2. **回退时打 warn 日志**：生产环境域名匹配失败应被监控，便于排查域名配置遗漏
3. **不删除 `DEFAULT_CONFIG` 兜底**：极端情况（表完全空）仍返回结构合法的空对象，避免 C 端崩溃
4. **不预设默认 domain**：不给"圣麟教育"种子记录硬编码 `domain=localhost`（开发/生产域名不同，硬编码反而需维护）；回退逻辑已覆盖开发场景
5. **tenant-context-resolver 不加回退**：该中间件通过 `x-site-id` header 显式指定租户（管理后台用），不指定则不设置上下文，语义明确，不应猜测默认租户

## 5. 测试策略（TDD）

| 测试文件 | 类型 | 覆盖问题 | 关键用例 |
|---|---|---|---|
| `plugins/zhao-auth/tests/services/tenant.service.test.ts`（新增） | 单元 | B1 | 1. admin 分支返回 siteName/featureFlags/updatedAt/channelsCount/templateName<br>2. 非 admin 分支同上<br>3. featureFlags 为空时降级为 {} |
| `plugins/zhao-common/tests/middlewares/site-resolver.test.ts`（新增） | 单元 | B2 | 1. domain 精确匹配 → 设置 siteDocumentId<br>2. domain 不匹配 → 回退到 id asc 第一条 + 打 warn<br>3. 表完全空 → 不设置 state（不崩溃） |
| `plugins/zhao-common/tests/controllers/config-public.test.ts`（新增） | 单元 | B2/B3 | 1. 读取 ctx.state.siteDocumentId（非 siteId）传给 service<br>2. siteDocumentId 为 undefined 时返回 DEFAULT_CONFIG |
| `plugins/zhao-common/tests/services/config-grants.test.ts`（新增） | 单元 | B3 | 1. currentTenantDocId 用 documentId 比对 moduleTenantGrants 数组 → 命中 true<br>2. documentId 不在数组 → false<br>3. globalEnabled=true 时即便未授权也 true<br>4. `resolveModuleVisibility` 收到的是 documentId 字符串（非数字 id）→ 验证第 514 行修复 |

**不写 E2E**：public/config 涉及中间件链，E2E 需启动完整 Strapi 实例，成本高收益低；单元测试覆盖中间件+控制器+服务三层已足够。

## 6. 改动文件清单（共 5 源文件 + 4 测试文件）

### 后端源文件（4）

1. `plugins/zhao-auth/server/src/services/tenant.service.ts` — 补 select/populate + 字段映射（B1）
2. `plugins/zhao-common/server/src/controllers/config.ts` — getPublic 读 siteDocumentId（B2）
3. `plugins/zhao-common/server/src/services/config.ts` — getPublicConfig 参数语义 + moduleGranted 用 documentId（B2/B3）
4. `plugins/zhao-common/server/src/middlewares/site-resolver.ts` — domain 回退逻辑（B2）

### 前端源文件（1）

5. `strapi-backend/pages/tenant/list.vue` — 2 处字段适配（B1）

### 测试文件（4 新增）

见第 5 节表格。

### 不改的文件

- `services/site-config.ts` — 本就是按 documentId 查询，类型对了自然工作
- `middlewares/tenant-context-resolver.ts` — 管理后台用，不加回退
- `content-types/site-config/schema.json` — 不动 schema
- `bootstrap.ts` — 不改种子逻辑

## 7. 验证点

修复后用户需手动验证：

1. **租户列表页** `/pages/tenant/list`：
   - 状态列显示"已启用"（若该租户 featureFlags.channel=true）
   - 标签 SSO/积分/题库等按 featureFlags 实际值显示蓝/灰
   - 更新时间显示真实日期（非"-"）
   - 站点名称显示真实 siteName（非"未命名租户"）

2. **C 端接口** `GET /api/zhao-common/v1/public/config?domain=localhost`：
   - `data.site.siteName` = "圣麟教育"
   - `data.site.domain` = 实际 domain（默认站点可能为空字符串，符合预期）
   - `data.moduleGrantedForCurrentTenant` 中已授权模块为 true（需 global-config 表有数据）

3. **回归验证**：
   - `npm test`（zhao-auth + zhao-common 测试套件全过）
   - `npm run dev` 启动无新报错

## 8. 回归风险

| 风险 | 缓解 |
|---|---|
| 其他控制器也误用 `ctx.state.siteId` 当 documentId | 全局检索确认：30+ 控制器（logistics/website/studio/third/course）都用数字 id 做 `db.query` 关系过滤，是正确用法；只有 `config.ts` 的 `getPublic`/`getPublicConfig` 链路误用，已全部覆盖在修复点 2/3 中 |
| `getPublicConfig` 参数名从 `siteId` 改为 `siteDocId` 破坏其他调用方 | 检索确认 `getPublicConfig` 仅被 `controllers/config.ts:852` 一处调用 |
| 前端其他页面也依赖 `name` 字段（非 `siteName`） | 检索后仅 list.vue 使用，detail.vue 用 documentId 单独查询 |
| domain 回退掩盖生产域名配置错误 | 回退时打 warn 日志，可监控 |
| tenant.service 返回字段变化破坏其他调用方 | tenant.service 仅被 tenant controller 调用，controller 仅返回给 list.vue |
| `strapi.db.query` 的 `populate` 语法与 documentService 不同导致查询失败 | 已在测试用例中覆盖两个分支的 populate 行为；TypeScript 编译会捕获语法错误 |
