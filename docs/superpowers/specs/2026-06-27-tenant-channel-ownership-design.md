# 租户渠道归属关系改造设计

## 背景与问题

当前 `channel.site` 为 manyToOne 关系（一个 channel 只能归属一个租户），且：

1. **数据归属层面**：新建/编辑租户时，前端 [detail.vue](file:///e:/code/web/pages/tenant/detail.vue) 的 `loadChannels` 调用 `getAdminChannelList`，未按 site 过滤，返回全局全量 channel；后端 [config.ts createSite](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts) 接收 channels 后逐个更新 `channel.site` 指向新租户，存在跨租户抢数据风险，且无权限校验。
2. **权限层面**：非 admin 用户也能把无权访问的 channel 归属到自己租户。
3. **模型层面**：业务需要一个 channel 可归属多个租户，现状 manyToOne 无法表达。

## 目标

- channel 与 site-config 改为 manyToMany 关系，支持一个 channel 归属多个租户。
- admin 创建/编辑租户时，channel 可选可不选（不选 = 该租户不独占任何 channel）。
- 非 admin 创建/编辑租户时，channel 必选，且只能选择自己有权限的 channel。
- 严格遵循 Strapi 规范，复用现有 channel scope 能力，不改权限层核心逻辑。

## 现状关键代码

- 数据模型：
  - [channel.schema.json](file:///e:/code/basic/plugins/zhao-channel/server/src/content-types/channel/schema.json#L43-L48) `site` manyToOne
  - [site-config.schema.json](file:///e:/code/basic/plugins/zhao-common/server/src/content-types/site-config/schema.json#L71-L76) `channels` oneToMany（mappedBy: "site"）
- 后端控制器：
  - [config.ts createSite](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts#L135-L235) 逐个更新 channel.site
  - [config.ts updateSiteById](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts) 类似逻辑
- 权限服务：
  - [channel-scope.service.ts](file:///e:/code/basic/plugins/zhao-auth/server/src/services/channel-scope.service.ts) `resolve(user)` 返回 `{ all, channelIds }`
- 前端：
  - [detail.vue loadChannels](file:///e:/code/web/pages/tenant/detail.vue#L488-L497) 未按 site/scope 过滤

## 设计

### 1. 数据模型变更

**channel.schema.json**：
- 删除 `site`（manyToOne）
- 新增 `sites`（manyToMany），`inversedBy: "channels"`

**site-config.schema.json**：
- `channels` 从 oneToMany 改为 manyToMany，`mappedBy: "sites"`

Strapi 自动维护中间表，无需手写 schema。中间表不可加业务字段（已确认不需要）。

### 2. 数据库迁移

新增迁移脚本 `001_channel_site_many_to_many.js`，存放于 `zhao-common/server/database/migrations/`（遵循项目迁移规范：3 位版本前缀 + zhao-common bootstrap 执行）。

迁移逻辑：
1. 读取所有现有 channel 记录的 `site_id`（旧 manyToOne 外键列）
2. 对每条 `site_id` 非空的记录，在 Strapi 生成的 manyToMany 中间表（命名由 Strapi 决定，迁移时通过 `strapi.db.query` 查询实际表名或使用 Document Service 建立关系）中插入 (channel_id, site_id) 关联
3. 迁移记录写入 `zhao_schema_migrations` 表，防止重复执行

迁移幂等性：先检查中间表是否已有该 (channel_id, site_id) 关联，存在则跳过。

### 3. 后端权限校验

**位置**：[config.ts](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts) 的 `createSite` 和 `updateSiteById` 方法。

**admin 用户**（`channelScope.all === true`）：
- channels 可选，可不选
- 可选任意 channel，无 scope 限制

**非 admin 用户**（`channelScope.all === false`）：
- channels 必选（至少 1 个），否则返回 400 "请选择至少一个渠道"
- 所选 channel 的 documentId 全部校验是否在 `channelScope.channelIds` 范围内
- 任一不在范围内，返回 400 "无权操作渠道 {channelName/documentId}"

**校验流程**：
1. 从 `ctx.state.channelScope` 获取 scope（由 `has-channel-scope` 策略注入，已存在）
2. 解析请求 body 中的 channels 数组（documentId 列表）
3. 若 `scope.all === false`：
   - channels 为空 → 400
   - 查询所选 channel 的 id 列表，与 `scope.channelIds` 求交集，若不等于所选集合 → 400
4. 通过校验后，用 Strapi manyToMany 原生 update 建立关系

### 4. 后端关系更新逻辑

**createSite**：
- 删除现有"逐个更新 channel.site 指向新租户"的循环逻辑（[config.ts#L188-L205](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts#L188-L205)）
- 创建 site-config 后，用 manyToMany 原生 update：
  ```ts
  await strapi.documents(UID).update({
    documentId: saved.documentId,
    data: { channels: { set: channelDocumentIds } }
  });
  ```

**updateSiteById**：
- 同样改用 `{ channels: { set: channelDocumentIds } }` 覆盖更新
- `set` 语义会自动解除旧关联、建立新关联，无需手动清理

### 5. 前端改造

**[detail.vue](file:///e:/code/web/pages/tenant/detail.vue)**：

- `loadChannels` 保持调用 `getAdminChannelList`，依赖后端 `has-channel-scope` 策略自动裁剪非 admin 可见范围（后端已有策略，前端无需改动此处）
- 渠道区块 UI 根据 `isEdit` 和用户角色显示提示：
  - admin + 新建：显示"可不选（该租户不独占任何渠道）"
  - 非 admin + 新建：显示"必选（只能选择你有权限的渠道）"，提交前前端校验非空（后端兜底）
- 提交 channels 时，传 documentId 数组（与后端约定一致）

**前端用户角色获取**：复用现有 `/my/roles` 接口（遵循项目约定，不调用 adminRoute）。

### 6. 不在本次范围

- channel scope 核心逻辑不变（仍只看用户角色 + 用户授权，不读 site-config.channels）
- C 端域名识别（site-resolver）不变
- admin 全渠道权限不变
- 现有 channel list 接口的 scope 过滤逻辑不变（已由 has-channel-scope 策略保证）

## 风险点

1. **数据迁移**：现有 channel.site 数据需正确转移到中间表，迁移失败会导致关联丢失。迁移脚本需充分测试，且在迁移前备份 `zhao_channels` 表。
2. **manyToOne → manyToMany schema 变更**：Strapi v5 不会自动迁移 schema（memory 约定），需手动执行迁移脚本。迁移脚本需在 schema 变更后、应用启动前执行一次。
3. **中间表命名**：Strapi 自动生成的中间表命名可能因插件 content-type 而异，迁移脚本需动态查询实际表名，避免硬编码。
4. **前端渠道列表裁剪**：依赖后端 has-channel-scope 策略已正确配置在 channel list 路由上，需验证该策略确实生效（若未配置，非 admin 仍会看到全量 channel）。

## 验证标准

1. admin 新建租户不选 channel → 创建成功，该租户 channels 为空
2. admin 新建租户选任意 channel → 创建成功，channel 归属该租户
3. 非 admin 新建租户不选 channel → 返回 400 "请选择至少一个渠道"
4. 非 admin 新建租户选自己有权限的 channel → 创建成功
5. 非 admin 新建租户选无权限的 channel → 返回 400 "无权操作渠道"
6. 非 admin 编辑租户时，channel 选项列表只包含自己有权限的 channel
7. 现有 channel.site 数据迁移后，原关联关系在中间表中正确存在
8. 一个 channel 可同时归属多个租户，互不影响
