# 自提点渠道默认选中与更新修复设计

- 日期：2026-07-05
- 涉及插件：zhao-channel、zhao-point
- 涉及前端：web/pages/points/pickup-locations.vue（无需改动）

## 1. 问题描述

页面 `http://localhost:5174/#/pages/points/pickup-locations` 编辑自提点时存在两个问题：

### 问题 1：默认渠道未选中

编辑某自提点时，已关联的渠道在复选框中全部呈现未选中状态。

### 问题 2：保存后渠道未更新

选中渠道保存（请求 `PUT /api/zhao-point/v1/admin/pickup-locations/:documentId`）后，响应体不含 `channels` 字段，且关系持久化结果异常。请求体示例：

```json
{
  "channels": ["fjd99i9cf0ww324puwyxu1zr","lju63vvfk4c28go9i6kuy9d4","b673l54r8cwspm5i1w37extq",78],
  ...
}
```

其中 `"b673..."` 与 `78` 指向同一渠道，转换后产生重复 id `[59,61,78,78]`。

## 2. 根因分析

### 问题 1 根因

`basic/plugins/zhao-channel/server/src/services/channel.ts` 的 `formatChannel` 函数返回对象不包含 `documentId` 字段：

```js
function formatChannel(channel: any) {
  return {
    id: channel.id,
    attributes: { name, code, ... }  // 缺少 documentId
  };
}
```

经 `extractList` → `flattenAttributes` 处理后，`channelOptions` 项无 `documentId`。前端 `pickup-locations.vue:135` 复选框比较 `ch.documentId || ch.id` 回退到 `ch.id`（数字），而 `form.channels` 中存的是 `c.documentId`（字符串），`["fjd99..."].includes(59)` 为 `false`，导致全不选中。

### 问题 2 根因

1. **去重缺失**：请求体混合 documentId 字符串与 numeric id，后端转换后产生重复 id，未去重直接写入 manyToMany 关系，可能引发关系异常。
2. **响应未 populate**：`point-admin.ts` 的 `updatePickupLocation` / `createPickupLocation` 调用 `db.query().update()` 后直接返回结果，未二次查询 populate channels，导致响应体缺失 `channels` 字段。

## 3. 设计方案

### 3.1 改动范围

| 文件 | 改动 |
|------|------|
| `basic/plugins/zhao-channel/server/src/services/channel.ts` | `formatChannel` 增加 `documentId` 字段 |
| `basic/plugins/zhao-point/server/src/controllers/point-admin.ts` | `createPickupLocation`：channelIds 去重 + update 后 populate 返回 |
| `basic/plugins/zhao-point/server/src/controllers/point-admin.ts` | `updatePickupLocation`：channelIds 去重 + update 后 populate 返回 |

前端 `web/pages/points/pickup-locations.vue` 无需改动。

### 3.2 formatChannel 增加 documentId

`basic/plugins/zhao-channel/server/src/services/channel.ts:35-54`：

```js
function formatChannel(channel: any) {
  if (!channel) return null;
  return {
    id: channel.id,
    documentId: channel.documentId,   // 新增
    attributes: {
      name: channel.name,
      code: channel.code,
      description: channel.description,
      channelTier: channel.channelTier,
      status: channel.status,
      path: channel.path,
      depth: channel.depth,
      parentChannelId: channel.parentChannel
        ? { id: channel.parentChannel.id, name: channel.parentChannel.name }
        : null,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    },
  };
}
```

向后兼容增量字段，惠及所有消费 channel 列表的页面。

### 3.3 后端 create/update 去重 + populate 返回

`basic/plugins/zhao-point/server/src/controllers/point-admin.ts` 的 `createPickupLocation` 与 `updatePickupLocation`：

```ts
// channelIds 去重
data.channels = [...new Set(channelIds.filter(Boolean))];

// update/create 后二次查询，populate channels 返回
const location = await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data });
const populated = await strapi.db.query(LOCATION_UID).findOne({
  where: { documentId },
  populate: {
    coverImage: true,
    businessLicense: true,
    channels: { select: ['id', 'documentId', 'name'] },
  },
});
ctx.body = { data: populated };
```

`createPickupLocation` 同理：创建后用 `location.documentId` 二次查询 populate 返回。

## 4. 数据流验证

### 4.1 编辑默认选中

1. 列表返回 `item.channels = [{id:59, documentId:"fjd99...", name:"起点"}, ...]`
2. `openEdit` → `form.channels = ["fjd99...", "lju63...", "b673..."]`
3. `channelOptions` 项含 `documentId` → `ch.documentId || ch.id` = `"fjd99..."`
4. `form.channels.includes("fjd99...")` → `true` → 复选框选中

### 4.2 保存更新

1. 用户选中渠道 → `form.channels = ["fjd99...", ..., 78]`
2. 后端转换：每个 chId 查 channel 表 → `[59, 61, 78]`
3. 去重：`[...new Set(...)]` → `[59, 61, 78]`
4. `db.query().update()` 写入 manyToMany 关系
5. 二次查询 populate channels 返回 → 响应体包含 channels 字段

## 5. 风险与回滚

- **风险**：
  - `formatChannel` 加字段向后兼容，无破坏性。
  - `Set` 对数字 id 去重安全。
  - 二次查询增加一次 DB 调用，性能影响可忽略。
- **回滚**：还原 3 处改动即可。
- **构建**：需构建 zhao-channel 与 zhao-point 两个插件并重启 Strapi 验证。

## 6. 验收标准

1. 编辑自提点时，已关联的渠道复选框默认选中。
2. 保存后响应体包含 `channels` 字段（数组形式，含 id/documentId/name）。
3. 重新加载列表后，渠道关系与保存时一致。
4. 重复 id（documentId 与 numeric id 混合传参）不会导致关系异常。
