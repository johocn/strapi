# 自提点渠道默认选中与更新修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复自提点编辑页两个问题——已关联渠道复选框默认未选中、保存后渠道关系未正确更新且响应体缺失 channels 字段。

**Architecture:** 方案 A 直击根因。zhao-channel 的 `formatChannel` 补 `documentId` 字段（向后兼容）；zhao-point 的 `createPickupLocation` / `updatePickupLocation` 对转换后的 channelIds 去重，并在写库后二次查询 populate channels 返回。前端无改动。

**Tech Stack:** Strapi v5 plugin (TypeScript)、zhao-channel、zhao-point、Strapi db.query API。

**Spec:** `docs/superpowers/specs/2026-07-05-pickup-locations-channel-default-and-update-fix-design.md`

---

## File Structure

| 文件 | 责任 | 改动类型 |
|------|------|----------|
| `basic/plugins/zhao-channel/server/src/services/channel.ts` | `formatChannel` 序列化渠道对象 | 修改（加 documentId） |
| `basic/plugins/zhao-point/server/src/controllers/point-admin.ts` | 自提点 CRUD 控制器 | 修改（create/update 去重 + populate 返回） |

无新增文件。前端 `web/pages/points/pickup-locations.vue` 不改。

---

### Task 1: formatChannel 增加 documentId 字段

**Files:**
- Modify: `basic/plugins/zhao-channel/server/src/services/channel.ts:35-54`

- [ ] **Step 1: 修改 formatChannel**

将 `basic/plugins/zhao-channel/server/src/services/channel.ts:35-54` 的 `formatChannel` 函数改为：

```ts
function formatChannel(channel: any) {
  if (!channel) return null;
  return {
    id: channel.id,
    documentId: channel.documentId,
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

仅新增 `documentId: channel.documentId,` 一行。

- [ ] **Step 2: 构建 zhao-channel 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-channel && yarn build
```
Expected: 构建成功，无 TS 错误。

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-channel/server/src/services/channel.ts basic/plugins/zhao-channel/dist
git commit -m "fix(zhao-channel): formatChannel 补 documentId 字段

修复自提点编辑页渠道复选框默认未选中：前端 channelOptions 项无 documentId，导致与 form.channels 中存储的 documentId 比对失败。"
```

---

### Task 2: updatePickupLocation 去重 + populate 返回

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/controllers/point-admin.ts:599-637`

- [ ] **Step 1: 修改 updatePickupLocation**

将 `basic/plugins/zhao-point/server/src/controllers/point-admin.ts:599-637` 的 `updatePickupLocation` 函数改为：

```ts
  async updatePickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      // 先查目标记录，校验渠道归属
      const existing = await strapi.db.query(LOCATION_UID).findOne({
        where: { documentId, deletedAt: null },
        populate: { channels: { select: ['id', 'documentId', 'name'] } },
      });
      if (!existing) { ctx.status = 404; ctx.body = { error: "自提点不存在" }; return; }
      if (Array.isArray(existing.channels) && existing.channels.length > 0) {
        assertInScope(ctx, existing, "channels");
      }
      const data = { ...body };
      // 解析 channels：documentId 转为数字 id，并校验新 channel 在 scope 内
      if (Array.isArray(data.channels) && data.channels.length > 0) {
        const channelIds = await Promise.all(
          data.channels.map(async (chId: string) => {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
              select: ['id', 'documentId'],
            });
            if (ch) {
              assertInScope(ctx, ch, "id");
            }
            return ch?.id;
          })
        );
        // 去重：避免 documentId 与 numeric id 混合传参指向同一渠道导致重复写入
        data.channels = [...new Set(channelIds.filter(Boolean))];
      }
      if (data.coverImage && typeof data.coverImage !== 'number') data.coverImage = Number(data.coverImage) || undefined;
      if (data.businessLicense && typeof data.businessLicense !== 'number') data.businessLicense = Number(data.businessLicense) || undefined;
      await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data });
      // 二次查询 populate channels 返回，保证响应体含渠道关系
      const populated = await strapi.db.query(LOCATION_UID).findOne({
        where: { documentId },
        populate: { coverImage: true, businessLicense: true, channels: { select: ['id', 'documentId', 'name'] } },
      });
      ctx.body = { data: populated };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },
```

关键改动：
1. `data.channels = [...new Set(channelIds.filter(Boolean))]` —— 去重
2. `await strapi.db.query(LOCATION_UID).update(...)` 不再赋值给 `location`（用不到）
3. update 后用 `findOne` 二次查询，populate `coverImage` / `businessLicense` / `channels`，作为响应体返回

- [ ] **Step 2: 构建 zhao-point 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && yarn build
```
Expected: 构建成功，无 TS 错误。

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-point/server/src/controllers/point-admin.ts basic/plugins/zhao-point/dist
git commit -m "fix(zhao-point): updatePickupLocation 去重 channels 并 populate 返回

- channelIds 去重避免 documentId 与 numeric id 混合传参导致关系异常
- update 后二次查询 populate channels 返回，修复响应体缺失 channels 字段"
```

---

### Task 3: createPickupLocation 去重 + populate 返回

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/controllers/point-admin.ts:567-597`

- [ ] **Step 1: 修改 createPickupLocation**

将 `basic/plugins/zhao-point/server/src/controllers/point-admin.ts:567-597` 的 `createPickupLocation` 函数改为：

```ts
  async createPickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const body = ctx.request.body?.data || ctx.request.body;
      const data = { ...body };
      // 解析 channels：documentId 转为数字 id，并校验每个 channel 是否在 scope 内
      if (Array.isArray(data.channels) && data.channels.length > 0) {
        const channelIds = await Promise.all(
          data.channels.map(async (chId: string) => {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
              select: ['id', 'documentId'],
            });
            if (ch) {
              // 校验 channel 在 scope 内
              assertInScope(ctx, ch, "id");
            }
            return ch?.id;
          })
        );
        // 去重：避免 documentId 与 numeric id 混合传参指向同一渠道导致重复写入
        data.channels = [...new Set(channelIds.filter(Boolean))];
      }
      // 解析 coverImage / businessLicense：可能是文件 id 或 media 对象
      if (data.coverImage && typeof data.coverImage !== 'number') data.coverImage = Number(data.coverImage) || undefined;
      if (data.businessLicense && typeof data.businessLicense !== 'number') data.businessLicense = Number(data.businessLicense) || undefined;
      const location = await strapi.db.query(LOCATION_UID).create({ data });
      // 二次查询 populate channels 返回，保证响应体含渠道关系
      const populated = await strapi.db.query(LOCATION_UID).findOne({
        where: { documentId: location.documentId },
        populate: { coverImage: true, businessLicense: true, channels: { select: ['id', 'documentId', 'name'] } },
      });
      ctx.body = { data: populated };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },
```

关键改动：
1. `data.channels = [...new Set(channelIds.filter(Boolean))]` —— 去重
2. create 后用 `location.documentId` 二次查询 populate 返回

- [ ] **Step 2: 构建 zhao-point 插件**

Run:
```bash
cd e:\code\basic\plugins\zhao-point && yarn build
```
Expected: 构建成功，无 TS 错误。

- [ ] **Step 3: 提交**

```bash
cd e:\code
git add basic/plugins/zhao-point/server/src/controllers/point-admin.ts basic/plugins/zhao-point/dist
git commit -m "fix(zhao-point): createPickupLocation 去重 channels 并 populate 返回

- channelIds 去重避免 documentId 与 numeric id 混合传参导致关系异常
- create 后二次查询 populate channels 返回，与 update 行为对齐"
```

---

### Task 4: 重启 Strapi 并浏览器验证

**Files:**
- 无文件改动，仅运行时验证

- [ ] **Step 1: 重启 Strapi**

停止当前 Strapi 进程，重新启动（确保 zhao-channel 与 zhao-point 两个插件的新 dist 被加载）。

Run（按项目实际启动方式）:
```bash
cd e:\code\basic && yarn develop
```
Expected: Strapi 启动成功，无插件加载错误。

- [ ] **Step 2: 验证问题 1 —— 编辑默认选中**

浏览器打开：
```
http://localhost:5174/#/pages/points/pickup-locations
```

操作：
1. 找到已关联 3 个渠道（如「冲仲裁」）的自提点
2. 点击「编辑」
3. 检查「关联渠道」区域的复选框

Expected: 已关联的 3 个渠道复选框默认呈选中状态（绿色 ✓）。

- [ ] **Step 3: 验证问题 2 —— 保存后渠道更新**

操作：
1. 在编辑弹窗中取消其中一个渠道，点击「保存」
2. 再次点击该自提点「编辑」
3. 检查渠道复选框状态

Expected:
- 保存接口 `PUT /api/zhao-point/v1/admin/pickup-locations/:documentId` 响应体包含 `channels` 字段（数组，每项含 id/documentId/name）
- 再次编辑时，渠道复选框状态与上一步保存的选择一致

- [ ] **Step 4: 验证去重（混合传参）**

操作（可选，需用 devtools 或 curl）：
1. 构造请求体，channels 同时包含某渠道的 documentId 与 numeric id：
```json
{"name":"测试","channels":["fjd99i9cf0ww324puwyxu1zr",59],"status":"active","sortOrder":0}
```
2. 调用 `PUT /api/zhao-point/v1/admin/pickup-locations/q7e6qrcnnnccfe8uhk2xjzca`

Expected:
- 接口返回 200
- 响应体 `data.channels` 仅含一个 id=59 的渠道（去重生效）
- DB 中该自提点仅关联一次该渠道（无重复关系行）

---

## Self-Review

**1. Spec coverage:**
- 3.2 formatChannel 增加 documentId → Task 1 ✓
- 3.3 后端 create/update 去重 + populate 返回 → Task 2 (update) + Task 3 (create) ✓
- 4.1 编辑默认选中数据流 → Task 4 Step 2 验证 ✓
- 4.2 保存更新数据流 → Task 4 Step 3 验证 ✓
- 6. 验收标准 1-4 → Task 4 Step 2/3/4 全覆盖 ✓

**2. Placeholder scan:** 无 TBD/TODO/"implement later"，所有代码块均完整。

**3. Type consistency:**
- Task 1 `documentId: channel.documentId`（小驼峰）一致
- Task 2/3 `data.channels = [...new Set(channelIds.filter(Boolean))]` 一致
- Task 2/3 populate select `['id', 'documentId', 'name']` 一致
- `LOCATION_UID` 常量在两处均为 `"plugin::zhao-point.pickup-location"` ✓

无问题。
