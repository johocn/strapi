# 积分商品编辑渠道显示修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复积分商品编辑时渠道显示 documentId/numeric id 而非 name 的问题——后端 create/update 二次查询 populate channel 返回，前端 openEdit 与显示逻辑统一用 documentId。

**Architecture:** 后端 2 处改动（redemption.ts 的 createProduct / updateProduct 加二次查询 populate），前端 2 处改动（openEdit channelId 取 documentId，显示用 documentId 匹配）。

**Tech Stack:** Strapi v5 + Vue 3 + uni-app + JavaScript。

**Spec:** `docs/superpowers/specs/2026-07-05-product-edit-channel-display-fix-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `basic/plugins/zhao-point/server/src/services/redemption.ts` | 商品 CRUD service | 修改（createProduct / updateProduct 加 populate） |
| `web/pages/points/products.vue` | 商品管理页 | 修改（openEdit + 显示匹配） |

无新增文件。

---

### Task 1: 后端 createProduct 加二次查询 populate channel

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/redemption.ts:27-52`

- [ ] **Step 1: 替换 createProduct 函数**

定位 `basic/plugins/zhao-point/server/src/services/redemption.ts:27-52`，整个 `createProduct` 函数替换为：

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

**关键改动**：
1. 将 `return await strapi.db.query(PRODUCT_UID).create({ data });` 拆为两步
2. 先 `const created = await ...create({ data })`
3. 再 `return await ...findOne({ where: { id: created.id }, populate: {...} })`

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

- [ ] **Step 3: 构建 zhao-point 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npm run build 2>&1 | tail -10
```
Expected: 构建成功，`dist/` 目录更新。

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-point/server/src/services/redemption.ts && git commit -m "feat(zhao-point): createProduct 返回 populate channel"
```

---

### Task 2: 后端 updateProduct 加二次查询 populate channel

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/redemption.ts:54-88`

- [ ] **Step 1: 替换 updateProduct 函数**

定位 `basic/plugins/zhao-point/server/src/services/redemption.ts:54-88`，整个 `updateProduct` 函数替换为：

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

**关键改动**：
1. 将 `return await strapi.db.query(PRODUCT_UID).update({ where: { id: numericId }, data });` 拆为两步
2. 先 `await ...update({ where: { id: numericId }, data })`（不 return）
3. 再 `return await ...findOne({ where: { id: numericId }, populate: {...} })`

- [ ] **Step 2: 验证 TS 编译**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30
```
Expected: 无新增错误。

- [ ] **Step 3: 构建 zhao-point 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && npm run build 2>&1 | tail -10
```
Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
cd e:\code\basic && git add plugins/zhao-point/server/src/services/redemption.ts && git commit -m "feat(zhao-point): updateProduct 返回 populate channel"
```

---

### Task 3: 前端 openEdit channelId 改用 documentId

**Files:**
- Modify: `web/pages/points/products.vue:587`

- [ ] **Step 1: 修改 openEdit 中 channelId 取值**

定位 `web/pages/points/products.vue:587`：

```ts
    channelId: item.channel?.documentId || item.channel?.id || '',
```

替换为：

```ts
    channelId: item.channel?.documentId || '',
```

**说明**：去掉 `|| item.channel?.id` fallback，确保 channelId 始终是 documentId 字符串，与后端 API 契约一致。

- [ ] **Step 2: 验证无语法错误**

Run:
```bash
cd e:\code\web && npx vue-tsc --noEmit 2>&1 | head -30
```
Expected: 无新增错误（如项目无 vue-tsc 可跳过此步，目视检查语法即可）。

---

### Task 4: 前端显示匹配改用 documentId

**Files:**
- Modify: `web/pages/points/products.vue:176`

- [ ] **Step 1: 修改渠道显示匹配逻辑**

定位 `web/pages/points/products.vue:176`：

```ts
              <text v-if="form.channelId">{{ channelOptions.find(c => c.id === form.channelId)?.name || form.channelId }}</text>
```

替换为：

```ts
              <text v-if="form.channelId">{{ channelOptions.find(c => c.documentId === form.channelId)?.name || form.channelId }}</text>
```

**说明**：将 `c.id` 改为 `c.documentId`，与 `form.channelId`（documentId 字符串）匹配。

- [ ] **Step 2: 验证无语法错误**

Run:
```bash
cd e:\code\web && npx vue-tsc --noEmit 2>&1 | head -30
```
Expected: 无新增错误。

---

### Task 5: 重启 Strapi 并浏览器验证

**Files:**
- 无文件改动，仅运行时验证

- [ ] **Step 1: 重启 Strapi**

停止当前 Strapi 进程，在 `e:\code\basic` 重新启动：

```bash
cd e:\code\basic && npm run develop
```
Expected: Strapi 启动成功，加载 zhao-point 新构建产物。

- [ ] **Step 2: 验证编辑渠道显示**

操作：
1. 登录后访问 `http://localhost:5174/#/pages/points/products`
2. 找到一个已关联渠道的商品，点编辑
3. 检查渠道显示是否为 name（如"起点"），而非 documentId 或 numeric id

Expected:
- 渠道显示 name（如"起点"）
- 不显示 documentId 字符串或 numeric id

- [ ] **Step 3: 验证保存后再次编辑**

操作：
1. 在编辑弹窗中选择一个渠道（如"起点"）
2. 点击保存
3. 等待列表刷新后，再次点该商品编辑
4. 检查渠道显示

Expected:
- 渠道显示 name（如"起点"），与上次选择一致
- 不显示 documentId 或 numeric id

- [ ] **Step 4: 验证 update 响应体含 channel**

操作（可选，devtools 网络）：
1. 编辑商品保存时，在 devtools Network 查看 PUT 请求响应
2. 检查响应体

Expected:
- 响应体包含 `channel: { id, documentId, name }` 字段
- 不再是缺少 channel 字段的响应

- [ ] **Step 5: 验证 create 响应体含 channel**

操作（可选）：
1. 新建一个商品，选择渠道
2. 保存时查看 POST 请求响应

Expected:
- 响应体包含 `channel: { id, documentId, name }` 字段

- [ ] **Step 6: 验证跨渠道商品（无 channel）**

操作：
1. 编辑一个无 channel 的跨渠道商品（`allowCrossChannel: true`，无 channel）
2. 检查渠道显示

Expected:
- 渠道显示 placeholder（如"请选择渠道"）
- 不报错

---

## Self-Review

**1. Spec coverage:**
- 3.1 改动范围 → Task 1（后端 createProduct）+ Task 2（后端 updateProduct）+ Task 3（前端 openEdit）+ Task 4（前端显示）✓
- 3.2 createProduct 改造 → Task 1 ✓
- 3.3 updateProduct 改造 → Task 2 ✓
- 3.4 openEdit 改造 → Task 3 ✓
- 3.5 显示匹配改造 → Task 4 ✓
- 5 边界情况 → Task 5 Step 6（跨渠道商品）✓
- 7 验收标准 → Task 5 全覆盖 ✓

**2. Placeholder scan:** 无 TBD/TODO，所有代码块完整。

**3. Type consistency:**
- `createProduct` 在 Task 1 改造，return populate 结果 ✓
- `updateProduct` 在 Task 2 改造，return populate 结果 ✓
- `form.channelId` 在 Task 3 取 documentId 字符串，Task 4 用 `c.documentId === form.channelId` 匹配一致 ✓
- populate 字段 `channel: { select: ['id', 'documentId', 'name'] }` 在 Task 1/2 一致 ✓

无问题。
