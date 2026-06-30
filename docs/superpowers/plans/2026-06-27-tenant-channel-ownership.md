# 租户渠道归属关系改造 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 channel 与 site-config 的关系从 manyToOne 改为 manyToMany，并实现 admin 可选/非 admin 必选+scope 校验的权限控制。

**Architecture:** 修改两个 schema 文件 + 新增迁移脚本 + 改造 createSite/updateSiteById 控制器（加 scope 校验、改用 manyToMany 原生 update）+ 前端 detail.vue 提示与提交适配。

**Tech Stack:** Strapi v5、TypeScript、Vue 3、PostgreSQL

**Spec:** [2026-06-27-tenant-channel-ownership-design.md](file:///e:/code/basic/docs/superpowers/specs/2026-06-27-tenant-channel-ownership-design.md)

---

## 文件结构

**修改：**
- `e:\code\basic\plugins\zhao-channel\server\src\content-types\channel\schema.json` — site 改 sites (manyToMany)
- `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json` — channels 改 manyToMany
- `e:\code\basic\plugins\zhao-common\server\src\controllers\config.ts` — createSite/updateSiteById 加 scope 校验 + 改关系更新逻辑

**新增：**
- `e:\code\basic\plugins\zhao-common\server\database\migrations\001_channel_site_many_to_many.js` — 数据迁移

**前端修改：**
- `e:\code\web\pages\tenant\detail.vue` — 渠道区块提示与提交适配
- `e:\code\web\src\api\site-config.js`（如存在）— 确认 channels 字段传递格式

---

## Task 1: 数据模型变更（manyToOne → manyToMany）

**Files:**
- Modify: `e:\code\basic\plugins\zhao-channel\server\src\content-types\channel\schema.json`
- Modify: `e:\code\basic\plugins\zhao-common\server\src\content-types\site-config\schema.json`

- [ ] **Step 1: 修改 channel.schema.json**

将 `site` 字段替换为 `sites`：

```json
"sites": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-common.site-config",
  "inversedBy": "channels"
}
```

- [ ] **Step 2: 修改 site-config.schema.json**

将 `channels` 字段改为 manyToMany：

```json
"channels": {
  "type": "relation",
  "relation": "manyToMany",
  "target": "plugin::zhao-channel.channel",
  "mappedBy": "sites"
}
```

- [ ] **Step 3: 重启 dev 验证 schema 加载**

运行：`cd e:\code\basic && npm run dev`
预期：启动成功，Strapi 自动创建中间表（表名类似 `zhao_channels_site-config_links` 或 `zhao_site_configs_channels_links`，以实际为准）
检查：启动日志无 schema 错误

- [ ] **Step 4: 确认中间表表名**

启动后用数据库工具查询，找到 Strapi 生成的中间表实际表名（记录下来，迁移脚本要用）。查询 SQL：
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%channel%site%' OR table_name LIKE '%site%channel%';
```

- [ ] **Step 5: 提交**

```bash
cd e:\code\basic
git add plugins/zhao-channel/server/src/content-types/channel/schema.json plugins/zhao-common/server/src/content-types/site-config/schema.json
git commit -m "refactor: channel-site 关系改为 manyToMany"
```

---

## Task 2: 数据迁移脚本

**Files:**
- Create: `e:\code\basic\plugins\zhao-common\server\database\migrations\001_channel_site_many_to_many.js`

- [ ] **Step 1: 确认迁移目录存在**

检查 `e:\code\basic\plugins\zhao-common\server\database\migrations\` 是否存在，不存在则创建。

- [ ] **Step 2: 编写迁移脚本**

```javascript
'use strict';

module.exports = {
  plugin: 'zhao-common',
  version: '001',
  name: 'channel_site_many_to_many',
  
  async up(strapi) {
    // 1. 查询所有有 site_id 的 channel（旧 manyToOne 外键）
    const channels = await strapi.db.connection('zhao_channels')
      .whereNotNull('site_id')
      .select('id', 'site_id');
    
    if (channels.length === 0) {
      strapi.log.info('[migration 001] 无需迁移，无 channel.site_id 数据');
      return;
    }
    
    // 2. 动态查询中间表表名（Strapi 自动生成，命名规则不固定）
    const tableName = await findJoinTableName(strapi);
    if (!tableName) {
      throw new Error('[migration 001] 找不到 channel-site 中间表，请确认 schema 已变更');
    }
    
    strapi.log.info(`[migration 001] 中间表: ${tableName}, 待迁移 ${channels.length} 条`);
    
    // 3. 逐条迁移（幂等：已存在则跳过）
    let migrated = 0;
    let skipped = 0;
    for (const ch of channels) {
      const exists = await strapi.db.connection(tableName)
        .where({ channel_id: ch.id, site_config_id: ch.site_id })
        .first();
      
      if (exists) {
        skipped++;
        continue;
      }
      
      // 中间表字段名需根据实际表结构调整，这里用 Strapi 默认命名
      await strapi.db.connection(tableName).insert({
        channel_id: ch.id,
        site_config_id: ch.site_id,
      });
      migrated++;
    }
    
    strapi.log.info(`[migration 001] 完成: 迁移 ${migrated} 条, 跳过 ${skipped} 条`);
  },
  
  async down(strapi) {
    const tableName = await findJoinTableName(strapi);
    if (tableName) {
      await strapi.db.connection(tableName).del();
      strapi.log.info(`[migration 001] 回滚: 清空 ${tableName}`);
    }
  },
};

async function findJoinTableName(strapi) {
  // Strapi manyToMany 中间表命名规则：通常为 {表A}_{表B}_links 或类似
  // 动态查询避免硬编码
  const candidates = [
    'zhao_channels_site-config_links',
    'zhao_site_configs_channels_links',
    'zhao_channels_site_configs_links',
  ];
  
  for (const name of candidates) {
    const exists = await strapi.db.connection.schema.hasTable(name);
    if (exists) return name;
  }
  
  // 兜底：模糊查询
  const tables = await strapi.db.connection('information_schema.tables')
    .where('table_schema', 'public')
    .where(function() {
      this.where('table_name', 'like', '%channel%site%')
          .orWhere('table_name', 'like', '%site%channel%');
    })
    .pluck('table_name');
  
  return tables.find(t => t.endsWith('_links')) || tables[0] || null;
}
```

注意：中间表字段名（`channel_id`、`site_config_id`）可能因 Strapi 版本而异，执行前需根据 Step 4 查到的实际表结构调整。

- [ ] **Step 3: 重启 dev 执行迁移**

```bash
cd e:\code\basic && npm run dev
```
预期：启动日志出现 `[migration 001] 完成: 迁移 N 条`

- [ ] **Step 4: 验证迁移结果**

数据库查询中间表，确认 (channel_id, site_config_id) 关联与原 `zhao_channels.site_id` 一致：
```sql
-- 对比迁移前后
SELECT id, site_id FROM zhao_channels WHERE site_id IS NOT NULL;
SELECT * FROM <中间表名>;
```

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-common/server/database/migrations/001_channel_site_many_to_many.js
git commit -m "feat: 新增 channel-site manyToMany 迁移脚本"
```

---

## Task 3: 后端权限校验 + 关系更新逻辑

**Files:**
- Modify: `e:\code\basic\plugins\zhao-common\server\src\controllers\config.ts`

- [ ] **Step 1: 在 createSite 中加入 scope 校验**

在 [config.ts createSite](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts) 方法内，解析 channelIds 后、创建 site-config 前，插入校验：

```ts
// 解析 channelIds 后（约 L167 之后）
const scope = ctx.state?.channelScope;
if (scope && !scope.all) {
  // 非 admin：channels 必选
  if (channelIds.length === 0) {
    ctx.status = 400;
    ctx.body = { error: "请选择至少一个渠道" };
    return;
  }
  // 非 admin：所选 channel 必须全在 scope 内
  const allowedIds = Array.isArray(scope.channelIds) ? scope.channelIds : [];
  const selectedChannels = await strapi.documents("plugin::zhao-channel.channel").findMany({
    filters: { documentId: { $in: channelIds } },
    select: ["id", "documentId", "name"],
  });
  const invalid = selectedChannels.find((ch: any) => !allowedIds.includes(ch.id));
  if (invalid) {
    ctx.status = 400;
    ctx.body = { error: `无权操作渠道 ${invalid.name || invalid.documentId}` };
    return;
  }
}
// admin (scope.all === true)：channels 可选可不选，无限制
```

- [ ] **Step 2: 替换 createSite 的关系更新逻辑**

删除现有"逐个更新 channel.site"循环（约 L188-L205），改为 manyToMany 原生 update：

```ts
// 替换原有 channelIds.length > 0 的循环块
if (channelIds.length > 0) {
  await strapi.documents(UID).update({
    documentId: saved.documentId,
    data: { channels: { set: channelIds.map((id: any) => ({ documentId: id })) } },
  });
}
```

- [ ] **Step 3: updateSiteById 同步改造**

在 updateSiteById 方法中，对 channelIds 加入同样的 scope 校验（同 Step 1 逻辑），并将关系更新改为 manyToMany set 语义。注意 updateSiteById 需要从 ctx.params 获取 documentId（不是 ctx.state.siteId）。

- [ ] **Step 4: 重启 dev 验证**

```bash
cd e:\code\basic && npm run dev
```

- [ ] **Step 5: 提交**

```bash
git add plugins/zhao-common/server/src/controllers/config.ts
git commit -m "feat: createSite/updateSiteById 加 channel scope 校验与 manyToMany 更新"
```

---

## Task 4: 前端改造

**Files:**
- Modify: `e:\code\web\pages\tenant\detail.vue`

- [ ] **Step 1: 确认前端用户角色获取方式**

检查 `e:\code\web\src\api\` 或 `e:\code\web\src\utils\auth.js` 是否已有获取当前用户角色的方法（应使用 `/my/roles` 接口）。若没有，新增：

```js
// e:\code\web\src\api\user.js（若不存在则创建）
import { get } from '../utils/request.js'
export function getMyRoles() {
  return get('/zhao-auth/v1/my/roles').then(res => res.data || res)
}
```

- [ ] **Step 2: detail.vue 加载用户角色**

在 [detail.vue](file:///e:/code/web/pages/tenant/detail.vue) 的 onMounted 中加载当前用户角色：

```js
const currentUserRole = ref('') // 'admin' 或其他

onMounted(async () => {
  // ... 现有逻辑
  try {
    const rolesData = await getMyRoles()
    const roles = Array.isArray(rolesData) ? rolesData : (rolesData.roles || [])
    currentUserRole.value = roles.includes('admin') ? 'admin' : 'other'
  } catch (e) {
    currentUserRole.value = 'other'
  }
})
```

- [ ] **Step 3: 渠道区块 UI 提示**

在渠道区块 section-header 下，根据角色显示提示：

```html
<view class="section-header">
  <text class="section-title">渠道配置</text>
  <text class="section-hint">
    {{ currentUserRole === 'admin' ? '可不选（该租户不独占任何渠道）' : '必选（只能选择你有权限的渠道）' }}
  </text>
</view>
```

- [ ] **Step 4: 提交前前端校验（非 admin 必选）**

在 [saveTenant](file:///e:/code/web/pages/tenant/detail.vue#L669) 方法开头校验：

```js
async function saveTenant(goBack = false) {
  if (saving.value || loading.value) return
  if (!formData.siteName || !formData.domain) {
    uni.showToast({ title: '请填写租户名称和域名', icon: 'none' })
    return
  }
  // 非 admin 必选渠道
  if (currentUserRole.value !== 'admin' && selectedChannels.value.length === 0) {
    uni.showToast({ title: '请选择至少一个渠道', icon: 'none' })
    return
  }
  // ... 现有保存逻辑
}
```

- [ ] **Step 5: 确认 channels 提交格式**

检查 [saveTenant](file:///e:/code/web/pages/tenant/detail.vue#L693) 中 `channels: selectedChannels.value.map(ch => ch.id)` —— manyToMany set 需要 documentId 数组。改为：

```js
channels: selectedChannels.value.map(ch => ch.documentId || ch.id)
```

（确认 channel 对象是否含 documentId，若 id 即为 documentId 则不变）

- [ ] **Step 6: 验证完整流程**

1. admin 新建租户不选渠道 → 成功
2. 非 admin 新建租户不选渠道 → 前端拦截 + 后端 400
3. 非 admin 新建租户选有权限渠道 → 成功
4. 非 admin 新建租户选无权限渠道 → 后端 400

- [ ] **Step 7: 提交**

```bash
cd e:\code\web
git add pages/tenant/detail.vue src/api/user.js
git commit -m "feat: 租户详情页渠道区块按角色显示提示与校验"
```

---

## Task 5: 端到端验证

- [ ] **Step 1: 验证 admin 场景**

- admin 登录 → 新建租户不选渠道 → 创建成功，DB 中间表无该 site 记录
- admin 新建租户选 2 个渠道 → 创建成功，中间表有 2 条记录
- admin 编辑该租户改为 3 个渠道 → 中间表更新为 3 条

- [ ] **Step 2: 验证非 admin 场景**

- 非 admin 登录 → 新建租户不选渠道 → 400 "请选择至少一个渠道"
- 非 admin 新建租户选自己有权限的渠道 → 成功
- 非 admin 新建租户选无权限的渠道（构造请求绕过前端）→ 400 "无权操作渠道"
- 非 admin 编辑租户时渠道列表只显示自己有权限的

- [ ] **Step 3: 验证多对多语义**

- 一个 channel 同时归属 2 个租户 → 中间表有 2 条记录，两个租户 channels 都包含该 channel

- [ ] **Step 4: 验证迁移数据完整性**

对比迁移前后：
```sql
-- 迁移前 site_id 非空的 channel 数量
SELECT count(*) FROM zhao_channels WHERE site_id IS NOT NULL;
-- 中间表记录数量（应相等）
SELECT count(*) FROM <中间表名>;
```

---

## Self-Review

**Spec 覆盖检查：**
- ✅ 数据模型 manyToOne → manyToMany（Task 1）
- ✅ 数据迁移（Task 2）
- ✅ admin 可选/非 admin 必选+scope 校验（Task 3）
- ✅ manyToMany 原生 update（Task 3 Step 2/3）
- ✅ 前端提示与校验（Task 4）
- ✅ 验证标准 1-8（Task 5 + 各 Task 内验证）

**风险点应对：**
- ✅ 数据迁移幂等（Task 2 Step 2 有 exists 检查）
- ✅ 中间表命名动态查询（Task 2 Step 2 findJoinTableName）
- ✅ has-channel-scope 策略验证（Task 5 Step 2 间接验证）

**类型一致性：**
- channelIds 全程指 documentId 数组
- scope.channelIds 全程指数字 id 数组（来自 channel-scope.service）
- 校验时用 documentId 查 channel 获取 id，再与 scope.channelIds 比对
