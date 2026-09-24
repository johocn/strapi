# 积分商品编辑渠道显示修复设计

- 日期：2026-07-05
- 涉及后端：zhao-point（redemption service）
- 涉及前端：web/pages/points/products.vue

## 1. 需求

页面 `http://localhost:5174/#/pages/points/products`（web 目录积分商品管理页）：

- 商品列表点编辑，选择渠道保存后，再次点编辑时渠道显示 documentId 或 numeric id，而非渠道 name
- 期望显示渠道 name（如"起点"）

## 2. 现状分析

### 2.1 后端 create/update 不 populate channel

`basic/plugins/zhao-point/server/src/services/redemption.ts`：

- `createProduct`（第 27-52 行）：
  ```ts
  return await strapi.db.query(PRODUCT_UID).create({ data });
  ```
- `updateProduct`（第 54-88 行）：
  ```ts
  return await strapi.db.query(PRODUCT_UID).update({ where: { id: numericId }, data });
  ```

两者均不 populate channel，响应体不含 channel 字段。用户提供的 update 响应已验证：

```json
{ "id": 10, "documentId": "ufhabceephxwa6r59extn1oe", "name": "积分渠道", ... }
```

无 `channel` 字段。

### 2.2 前端 openEdit channelId 取值

`web/pages/points/products.vue:587`：

```ts
channelId: item.channel?.documentId || item.channel?.id || '',
```

- documentId 优先，fallback 到 numeric id
- 若列表数据 `item.channel` 是 numeric id（78），则 `form.channelId = 78`

### 2.3 前端显示匹配逻辑

`web/pages/points/products.vue:176`：

```ts
<text v-if="form.channelId">{{ channelOptions.find(c => c.id === form.channelId)?.name || form.channelId }}</text>
```

- `c.id` 是 numeric（78）
- 若 `form.channelId` 是 documentId 字符串 → `===` 不匹配 → fallback 显示 documentId
- 若 `form.channelId` 是 numeric 78 → 匹配，但保存时传 numeric id（与 API 契约不一致）

### 2.4 channelOptions 数据

`web/src/api/channel.js:10-12`：

```ts
export function getAdminChannelList(params = {}) {
  return get(`${ADMIN}/channels`, params).then(extractList)
}
```

返回的 channel 项同时含 `id`（numeric）与 `documentId`（字符串）。

## 3. 设计方案

### 3.1 改动范围

| 文件 | 改动 |
|------|------|
| `basic/plugins/zhao-point/server/src/services/redemption.ts` `createProduct` | create 后二次查询 populate channel 返回 |
| `basic/plugins/zhao-point/server/src/services/redemption.ts` `updateProduct` | update 后二次查询 populate channel 返回 |
| `web/pages/points/products.vue:587` `openEdit` | channelId 取 documentId，不 fallback numeric id |
| `web/pages/points/products.vue:176` 显示 | 用 `c.documentId === form.channelId` 匹配 |

### 3.2 后端 createProduct 改造

`redemption.ts` 的 `createProduct` 在 create 后二次查询 populate 返回：

```ts
const createProduct = async (data: any) => {
  // 整数字段清洗：防止浮点精度泄漏（如 -2e-18）
  const intFields = ['pointsCost', 'stock', 'totalStock', 'maxPerUser', 'sortOrder'];
  for (const key of intFields) {
    if (data[key] !== undefined && data[key] !== null) {
      data[key] = Math.round(Number(data[key])) || 0;
    }
  }
  // 浮点字段清洗
  if (data.originalPrice !== undefined && data.originalPrice !== null) {
    data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
  }
  if (data.price !== undefined && data.price !== null) {
    data.price = Math.round(Number(data.price) * 100) / 100 || null;
  }
  // 解析 channel：documentId 转为数字 id
  if (data.channel && typeof data.channel === 'string') {
    const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
      where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
      select: ['id'],
    });
    if (ch) data.channel = ch.id;
    else delete data.channel;
  }
  const created = await strapi.db.query(PRODUCT_UID).create({ data });
  // 二次查询 populate channel 等关联字段返回
  return await strapi.db.query(PRODUCT_UID).findOne({
    where: { id: created.id },
    populate: {
      channel: { select: ['id', 'documentId', 'name'] },
      coverImage: true,
      images: true,
      video: true,
    },
  });
};
```

### 3.3 后端 updateProduct 改造

`redemption.ts` 的 `updateProduct` 在 update 后二次查询 populate 返回：

```ts
const updateProduct = async (id: string | number, data: any) => {
  // 整数字段清洗
  const intFields = ['pointsCost', 'stock', 'totalStock', 'maxPerUser', 'sortOrder'];
  for (const key of intFields) {
    if (data[key] !== undefined && data[key] !== null) {
      data[key] = Math.round(Number(data[key])) || 0;
    }
  }
  if (data.originalPrice !== undefined && data.originalPrice !== null) {
    data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
  }
  if (data.price !== undefined && data.price !== null) {
    data.price = Math.round(Number(data.price) * 100) / 100 || null;
  }
  // 解析 channel：documentId 转为数字 id
  if (data.channel && typeof data.channel === 'string') {
    const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
      where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
      select: ['id'],
    });
    if (ch) data.channel = ch.id;
    else delete data.channel;
  }
  // id 可能是 documentId，需转为数字 id
  let numericId = id;
  if (typeof id === 'string' && isNaN(Number(id))) {
    const product = await strapi.db.query(PRODUCT_UID).findOne({
      where: { documentId: id },
      select: ['id'],
    });
    if (!product) throwError("POINT_013", "商品不存在");
    numericId = product.id;
  }
  await strapi.db.query(PRODUCT_UID).update({ where: { id: numericId }, data });
  // 二次查询 populate channel 等关联字段返回
  return await strapi.db.query(PRODUCT_UID).findOne({
    where: { id: numericId },
    populate: {
      channel: { select: ['id', 'documentId', 'name'] },
      coverImage: true,
      images: true,
      video: true,
    },
  });
};
```

### 3.4 前端 openEdit 改造

`web/pages/points/products.vue:587`：

```ts
channelId: item.channel?.documentId || '',
```

去掉 `|| item.channel?.id` fallback，确保 channelId 始终是 documentId 字符串。

### 3.5 前端显示匹配改造

`web/pages/points/products.vue:176`：

```ts
<text v-if="form.channelId">{{ channelOptions.find(c => c.documentId === form.channelId)?.name || form.channelId }}</text>
```

将 `c.id` 改为 `c.documentId`，与 `form.channelId`（documentId 字符串）匹配。

## 4. 数据流验证

1. 用户在编辑弹窗选"起点"渠道（documentId="fjd99..."）
2. `form.channelId = "fjd99..."`
3. 保存传 `channel: "fjd99..."`（documentId 字符串）
4. 后端 `updateProduct` 第 69-76 行解析 documentId 转 numeric id 写入 ✓
5. 后端二次查询 populate channel 返回 `{ channel: { id: 59, documentId: "fjd99...", name: "起点" } }`
6. 前端列表刷新，`item.channel.documentId = "fjd99..."`
7. 再次点编辑 → `channelId = "fjd99..."`
8. 显示 `channelOptions.find(c => c.documentId === "fjd99...")?.name` = "起点" ✓

## 5. 边界情况

| 场景 | 处理 |
|------|------|
| 商品无 channel（跨渠道商品） | `item.channel` 为 null → `channelId = ''` → 显示 placeholder |
| channelOptions 未加载完成 | `find` 返回 undefined → fallback 显示 documentId（短暂闪现后正常） |
| createProduct 无 channel 参数 | `data.channel` 为 undefined → 跳过解析 → 二次查询 channel 为 null |

## 6. 风险与回滚

- **风险**：
  - create/update 响应体字段增多（含 channel、coverImage、images、video），前端如有依赖响应体字段较少的场景不受影响（字段只增不减）
  - 二次查询增加一次 DB 查询，性能影响可忽略
- **回滚**：
  - 后端：还原 `createProduct` 与 `updateProduct` 的 return 语句
  - 前端：还原 `openEdit` 第 587 行与显示第 176 行

## 7. 验收标准

1. 编辑商品选择渠道保存后，再次点编辑，渠道显示 name（如"起点"），不显示 documentId 或 numeric id
2. createProduct 响应体包含 `channel: { id, documentId, name }`
3. updateProduct 响应体包含 `channel: { id, documentId, name }`
4. 跨渠道商品（无 channel）编辑时不报错，渠道显示 placeholder
