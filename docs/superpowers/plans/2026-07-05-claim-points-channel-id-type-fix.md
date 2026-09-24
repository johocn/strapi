# claim-points 渠道类型修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `claim-points` 接口将 documentId 字符串误当作 numeric id 写入 join table 导致 PostgreSQL 类型错误的 bug

**Architecture:** 在 `claimQuizPoints` 函数内新增 `resolveChannelNumericId` helper，参考 redemption.ts:322-335 范式用 `$or: [{id}, {documentId}]` 查询 channel 表拿 numeric id；将 `finalChannelId` 计算与 scope 校验解耦，scope 校验保留原值比对，最终传给 `earnCustomPoints` 时使用转换后的 numeric id

**Tech Stack:** Strapi v5 + TypeScript + PostgreSQL + Knex

**Spec:** `docs/superpowers/specs/2026-07-05-claim-points-channel-id-type-fix-design.md`

---

## File Structure

- **Modify**: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` — `claimQuizPoints` 函数内新增 helper + 改造 finalChannelId 计算
- **Modify**: `e:\code\basic\plugins\zhao-quiz\server\src\register.ts` — 新增 QUIZ_021 错误码

helper 函数作为闭包内嵌在 `claimQuizPoints` 内，不抽到模块顶层（YAGNI，仅一处使用）。

---

## Task 1: 新增 QUIZ_021 错误码

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\register.ts:22-23`

- [ ] **Step 1: 用 Read 工具确认当前 i18n 配置**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\register.ts` 第 1-30 行
Expected: 看到 `QUIZ_020: "必须选择积分充值渠道",` 在第 22 行

- [ ] **Step 2: 用 Edit 工具新增 QUIZ_021**

old_string:
```ts
      QUIZ_020: "必须选择积分充值渠道",
    });
```

new_string:
```ts
      QUIZ_020: "必须选择积分充值渠道",
      QUIZ_021: "所选渠道不存在",
    });
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\register.ts` 第 20-26 行
Expected: 看到 `QUIZ_021: "所选渠道不存在",`

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 2: 新增 resolveChannelNumericId helper + 改造 finalChannelId 计算

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts:243-264`

- [ ] **Step 1: 用 Read 工具确认当前代码**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` 第 238-266 行
Expected:
```ts
    // 读取课程渠道配置（pointChannel + channelIds）
    const course = await strapi.documents("plugin::zhao-course.course").findOne({
      documentId: courseDocumentId,
      populate: { pointChannel: true },
    });
    const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
    const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
    let finalChannelId: number | string | null = selectedChannelId ?? pointChannelId;

    // 必传校验：selectedChannelId 与 pointChannelId 都为空时报错
    if (!finalChannelId) {
      const e: any = new Error("必须选择积分充值渠道");
      e.code = "QUIZ_020";
      e.status = 400;
      throw e;
    }

    // specific 模式：校验 finalChannelId ∈ channelIds
    if (course?.channelScope === "specific" && finalChannelId) {
      const inScope = channelIds.some((id: any) => String(id) === String(finalChannelId));
      if (!inScope) {
        const e: any = new Error("所选渠道不在课程所属渠道范围内");
        e.code = "QUIZ_018";
        e.status = 400;
        throw e;
      }
    }
```

- [ ] **Step 2: 用 Edit 工具替换 finalChannelId 计算块 + 新增 helper + 转换**

old_string:
```ts
    const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
    const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
    let finalChannelId: number | string | null = selectedChannelId ?? pointChannelId;

    // 必传校验：selectedChannelId 与 pointChannelId 都为空时报错
    if (!finalChannelId) {
      const e: any = new Error("必须选择积分充值渠道");
      e.code = "QUIZ_020";
      e.status = 400;
      throw e;
    }

    // specific 模式：校验 finalChannelId ∈ channelIds
    if (course?.channelScope === "specific" && finalChannelId) {
      const inScope = channelIds.some((id: any) => String(id) === String(finalChannelId));
      if (!inScope) {
        const e: any = new Error("所选渠道不在课程所属渠道范围内");
        e.code = "QUIZ_018";
        e.status = 400;
        throw e;
      }
    }
```

new_string:
```ts
    const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
    const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
    const finalChannelRaw: number | string | null = selectedChannelId ?? pointChannelId;

    // 必传校验：selectedChannelId 与 pointChannelId 都为空时报错
    if (!finalChannelRaw) {
      const e: any = new Error("必须选择积分充值渠道");
      e.code = "QUIZ_020";
      e.status = 400;
      throw e;
    }

    // specific 模式：基于字符串/documentId 比对 finalChannelRaw ∈ channelIds
    if (course?.channelScope === "specific" && finalChannelRaw) {
      const inScope = channelIds.some((id: any) => String(id) === String(finalChannelRaw));
      if (!inScope) {
        const e: any = new Error("所选渠道不在课程所属渠道范围内");
        e.code = "QUIZ_018";
        e.status = 400;
        throw e;
      }
    }

    // documentId → numeric id 转换（参考 redemption.ts:322-335 范式）
    const resolveChannelNumericId = async (channelId: number | string): Promise<number | null> => {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: {
          $or: [
            { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
            { documentId: String(channelId) },
          ],
        },
        select: ['id'],
      });
      return ch?.id ?? null;
    };
    const finalChannelId = await resolveChannelNumericId(finalChannelRaw);
    if (!finalChannelId) {
      const e: any = new Error("所选渠道不存在");
      e.code = "QUIZ_021";
      e.status = 400;
      throw e;
    }
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` 第 243-285 行
Expected:
- 第 245 行：`const finalChannelRaw: number | string | null = selectedChannelId ?? pointChannelId;`
- 第 256-264 行：scope 校验使用 `finalChannelRaw`
- 第 267-281 行：`resolveChannelNumericId` helper 定义
- 第 282 行：`const finalChannelId = await resolveChannelNumericId(finalChannelRaw);`
- 第 283-289 行：QUIZ_021 校验

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 3: 修改 earnCustomPoints 调用使用已转换的 numeric id

**Files:**
- Modify: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts:288`（原 `channelId: finalChannelId ?? undefined,`）

- [ ] **Step 1: 用 Read 工具确认当前代码**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` 第 295-310 行（行号因 Task 2 新增代码下移约 18 行）
Expected:
```ts
    // 使用 earnCustomPoints 发放用户自主领取的积分
    try {
      const pointService = strapi.plugin("zhao-point")?.service("point");
      if (pointService?.earnCustomPoints) {
        await pointService.earnCustomPoints({
          userId,
          action: "quiz_pass",
          points: totalPoints,
          source: dedupeSource,
          remark: `答题获得${totalPoints}积分`,
          channelId: finalChannelId ?? undefined,
          userChannelId: userChannelId ?? undefined,
        } as any);
      }
    } catch (e: any) {
```

- [ ] **Step 2: 用 Edit 工具替换 channelId 字段**

old_string:
```ts
          channelId: finalChannelId ?? undefined,
          userChannelId: userChannelId ?? undefined,
```

new_string:
```ts
          channelId: finalChannelId,
          userChannelId: userChannelId ?? undefined,
```

注意：`finalChannelId` 在 Task 2 改造后类型为 `number`（不会是 null，前面已校验抛 QUIZ_021），所以去掉 `?? undefined`。

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` 第 300-310 行
Expected: 看到 `channelId: finalChannelId,`（无 `?? undefined`）

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 4: 编译 zhao-quiz 插件

**Files:**
- 无文件改动，仅编译验证

- [ ] **Step 1: 运行 npm run build**

Run:
```bash
cd e:\code\basic\plugins\zhao-quiz; npm run build
```

Expected:
- 退出码 0
- 输出包含 `dist/server/index.js` 已生成
- 无 TypeScript 错误

- [ ] **Step 2: 如编译失败，检查错误**

如出现 TS 错误，常见原因：
- `finalChannelId` 类型不匹配（期望 `number | undefined`，实际 `number`）→ 检查 Task 3 改动
- `resolveChannelNumericId` 未定义 → 检查 Task 2 helper 是否在 `claimQuizPoints` 函数内
- `finalChannelRaw` 未定义 → 检查 Task 2 变量名

修复后重新编译。

- [ ] **Step 3: 不提交，继续下一个 Task**

---

## Task 5: 重启 Strapi + API 验证

**Files:**
- 无文件改动，重启 + curl 验证

- [ ] **Step 1: 检查 Strapi 是否在运行**

Run:
```bash
netstat -ano | findstr :1337
```

- 如端口被占用，记录 PID 后 `taskkill /F /PID <PID>`

- [ ] **Step 2: 启动 Strapi**

Run (blocking: false, cwd: e:\code\basic):
```bash
npm run develop
```

等待约 30 秒让 Strapi 完全启动。

- [ ] **Step 3: 用 CheckCommandStatus 工具确认启动**

`command_id` 用 Step 2 返回的 id，`wait_ms_before_check: 25000`

Expected 日志: `Server listening on http://localhost:1337`

- [ ] **Step 4: 验证场景 1 - documentId 字符串成功领取**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-quiz/v1/my/quiz/claim-points ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJzaGFvQDEyNi5jb20iLCJ1c2VybmFtZSI6InNoYW8iLCJ6aGFvUm9sZXMiOlsiYXV0aGVudGljYXRlZCJdLCJpYXQiOjE3ODMxNjI3MDEsImV4cCI6MTc4NTc1NDcwMX0.ENfTJUhof2TQyO8dUo8As8ke8zIRZP4IOJwLJC_-ZqI" ^
  -d "{\"courseDocumentId\":\"e3nkbz8dvn1dkmfezfyna7xi\",\"totalEarnedPoints\":150,\"lessonDocumentId\":\"i22ndsxiy04hxcaal0fm3fsk\",\"selectedChannelId\":\"fjd99i9cf0ww324puwyxu1zr\"}"
```

Expected: `200 {"data":{"pointsEarned":150}}` 或 `400 {"error":"该课时答题积分已领取"}` (QUIZ_013，已领过)

如返回原类型错误 `无效的类型 integer 输入语法` → 改动未生效，检查 Task 2-3 是否正确应用 + Task 4 是否编译 + Strapi 是否重启。

- [ ] **Step 5: 验证场景 2 - 不存在的 documentId 报 QUIZ_021**

Run:
```bash
curl -X POST http://localhost:1337/api/zhao-quiz/v1/my/quiz/claim-points ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJzaGFvQDEyNi5jb20iLCJ1c2VybmFtZSI6InNoYW8iLCJ6aGFvUm9sZXMiOlsiYXV0aGVudGljYXRlZCJdLCJpYXQiOjE3ODMxNjI3MDEsImV4cCI6MTc4NTc1NDcwMX0.ENfTJUhof2TQyO8dUo8As8ke8zIRZP4IOJwLJC_-ZqI" ^
  -d "{\"courseDocumentId\":\"e3nkbz8dvn1dkmfezfyna7xi\",\"totalEarnedPoints\":10,\"lessonDocumentId\":\"nonexistent-doc-id\",\"selectedChannelId\":\"nonexistent-channel-doc-id\"}"
```

Expected: `400 {"error":"所选渠道不存在"}` (QUIZ_021)

如返回 `400 {"error":"该课时答题积分已领取"}` (QUIZ_013) → 改用其他 lessonDocumentId 重新测试

- [ ] **Step 6: 验证场景 3 - 不传 selectedChannelId 且无 pointChannelId 报 QUIZ_020**

找一个未设置 pointChannel 的课程做测试。如所有课程都有 pointChannel，可跳过此场景（依赖测试数据）。

如可测：
```bash
curl -X POST http://localhost:1337/api/zhao-quiz/v1/my/quiz/claim-points ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJzaGFvQDEyNi5jb20iLCJ1c2VybmFtZSI6InNoYW8iLCJ6aGFvUm9sZXMiOlsiYXV0aGVudGljYXRlZCJdLCJpYXQiOjE3ODMxNjI3MDEsImV4cCI6MTc4NTc1NDcwMX0.ENfTJUhof2TQyO8dUo8As8ke8zIRZP4IOJwLJC_-ZqI" ^
  -d "{\"courseDocumentId\":\"<无pointChannel的课程docId>\",\"totalEarnedPoints\":10,\"lessonDocumentId\":\"<某课时docId>\"}"
```

Expected: `400 {"error":"必须选择积分充值渠道"}` (QUIZ_020)

- [ ] **Step 7: 验证 zhao_point_records_channel_lnk 字段类型**

如场景 1 成功，查询数据库确认 join table 写入的是 numeric id：

Run:
```bash
psql -U postgres -d strapi -c "SELECT channel_id, point_record_id FROM zhao_point_records_channel_lnk ORDER BY id DESC LIMIT 5;"
```

Expected: `channel_id` 列为数字（如 59），不是字符串 documentId

- [ ] **Step 8: 不提交，继续下一个 Task**

---

## Task 6: 提交变更

**Files:**
- Commit: `e:\code\basic\plugins\zhao-quiz\server\src\services\quiz.ts` + `e:\code\basic\plugins\zhao-quiz\server\src\register.ts`

- [ ] **Step 1: 检查 git 状态**

Run:
```bash
git -C e:\code\basic status --short plugins/zhao-quiz/server/src/services/quiz.ts plugins/zhao-quiz/server/src/register.ts
```

Expected: 两个文件显示 ` M`（modified）

- [ ] **Step 2: 查看变更 diff**

Run:
```bash
git -C e:\code\basic diff plugins/zhao-quiz/server/src/services/quiz.ts plugins/zhao-quiz/server/src/register.ts
```

Expected:
- register.ts: 新增 `QUIZ_021: "所选渠道不存在",`
- quiz.ts: `finalChannelId` → `finalChannelRaw` + `finalChannelId = await resolveChannelNumericId(...)` + `channelId: finalChannelId,`（去掉 `?? undefined`）

- [ ] **Step 3: 提交**

```bash
git -C e:\code\basic add plugins/zhao-quiz/server/src/services/quiz.ts plugins/zhao-quiz/server/src/register.ts
git -C e:\code\basic commit -m "fix(zhao-quiz): 修复 claim-points documentId 类型错误

- 新增 resolveChannelNumericId helper 将 documentId 转换为 numeric id
- 参考 redemption.ts:322-335 范式用 \$or 查询兼容两种入参
- finalChannelId 计算与 scope 校验解耦，scope 校验保留原值比对
- 新增 QUIZ_021 错误码: 所选渠道不存在
- 修复 zhao_point_records_channel_lnk.channel_id 类型错误"
```

Expected: commit 成功

- [ ] **Step 4: 完成**

修复任务全部完成。
