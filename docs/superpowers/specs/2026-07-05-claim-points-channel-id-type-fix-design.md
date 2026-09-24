# claim-points 渠道类型修复设计

**Date**: 2026-07-05
**Status**: Approved
**Owner**: dev

## 背景

接口 `POST /api/zhao-quiz/v1/my/quiz/claim-points` 报错：

```json
{
  "error": "insert into \"public\".\"zhao_point_records_channel_lnk\" (\"channel_id\", \"point_record_id\") values ($1, $2) returning \"id\" - 无效的类型 integer 输入语法: \"fjd99i9cf0ww324puwyxu1zr\""
}
```

请求参数：
```json
{
  "courseDocumentId": "e3nkbz8dvn1dkmfezfyna7xi",
  "totalEarnedPoints": 150,
  "lessonDocumentId": "i22ndsxiy04hxcaal0fm3fsk",
  "selectedChannelId": "fjd99i9cf0ww324puwyxu1zr"
}
```

## 根因

1. 前端 ChannelPicker 传 `selectedChannelId` = 渠道 documentId 字符串（如 `fjd99i9cf0ww324puwyxu1zr`）
2. 后端 `claimQuizPoints`（[quiz.ts:217-300](file:///e:/code/basic/plugins/zhao-quiz/server/src/services/quiz.ts#L217-L300)）直接透传给 `pointService.earnCustomPoints({ channelId })`
3. point 服务 `createRecord` 把 `channel: extra.channelId` 当作 relation numeric id 写入 `zhao_point_records_channel_lnk.channel_id`
4. join table 的 `channel_id` 列类型为 integer，PostgreSQL 拒绝字符串 documentId → 报错

## 数据流分析

| 字段 | 来源 | 实际类型 | 当前行为 | 期望行为 |
|---|---|---|---|---|
| `selectedChannelId` | 前端 ChannelPicker | documentId 字符串 | 直接透传 | 转换为 numeric id |
| `pointChannelId` | `course.pointChannel.id` | numeric id | 直接透传 | 已是 numeric，保险也走转换 |
| `userChannelId` | `myCh.channel.id` | numeric id | 已是 numeric | 不动 |
| `channelIds`（scope 校验） | `course.channelIds` JSON 字段 | 不确定（写入时决定） | 与 `finalChannelId` 字符串比对 | 都基于 documentId 字符串比对 |

## 设计

### 范围
仅修改 [quiz.ts](file:///e:/code/basic/plugins/zhao-quiz/server/src/services/quiz.ts) 的 `claimQuizPoints` 函数 + [register.ts](file:///e:/code/basic/plugins/zhao-quiz/server/src/register.ts) 新增错误码。不改 point 服务、不改前端、不改 userChannelId。

### 新增 helper：documentId → numeric id 转换

参考 [redemption.ts:322-335](file:///e:/code/basic/plugins/zhao-point/server/src/services/redemption.ts#L322-L335) 的成熟范式，inline 在 `claimQuizPoints` 内：

```ts
async function resolveChannelNumericId(channelId: number | string | null | undefined): Promise<number | null> {
  if (!channelId) return null;
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
}
```

`$or` 同时支持 numeric id 和 documentId，对两种入参都兼容。

### 改动 1：`finalChannelId` 计算与 scope 校验分离

[quiz.ts:243-264](file:///e:/code/basic/plugins/zhao-quiz/server/src/services/quiz.ts#L243-L264)：

**改前**：
```ts
const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
let finalChannelId: number | string | null = selectedChannelId ?? pointChannelId;

if (!finalChannelId) { /* QUIZ_020 */ }

if (course?.channelScope === "specific" && finalChannelId) {
  const inScope = channelIds.some((id: any) => String(id) === String(finalChannelId));
  if (!inScope) { /* QUIZ_018 */ }
}
```

**改后**：
```ts
const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
const finalChannelRaw: number | string | null = selectedChannelId ?? pointChannelId;

// 必传校验
if (!finalChannelRaw) {
  const e: any = new Error("必须选择积分充值渠道");
  e.code = "QUIZ_020";
  e.status = 400;
  throw e;
}

// specific 模式：基于字符串/documentId 比对
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
const finalChannelId = await resolveChannelNumericId(finalChannelRaw);
if (!finalChannelId) {
  const e: any = new Error("所选渠道不存在");
  e.code = "QUIZ_021";
  e.status = 400;
  throw e;
}
```

### 改动 2：`earnCustomPoints` 调用使用已转换的 numeric id

[quiz.ts:282-290](file:///e:/code/basic/plugins/zhao-quiz/server/src/services/quiz.ts#L282-L290)：

**改前**：
```ts
channelId: finalChannelId ?? undefined,
```

**改后**：
```ts
channelId: finalChannelId,  // 已是 number（不会是 null，前面已校验）
```

### 改动 3：新增错误码

[register.ts](file:///e:/code/basic/plugins/zhao-quiz/server/src/register.ts)：

```ts
QUIZ_020: "必须选择积分充值渠道",
QUIZ_021: "所选渠道不存在",
```

### helper 函数位置

放在 `claimQuizPoints` 函数内（闭包访问 strapi），与原 `userChannelId` 查询块紧邻。不抽到模块顶层（YAGNI，仅一处使用）。

## 验证点

1. 传 documentId `fjd99i9cf0ww324puwyxu1zr` → 转换为 numeric id（如 59）→ 成功插入 `zhao_point_records_channel_lnk`，response 200 `{"pointsEarned":150}`
2. 传 numeric id `59` → 转换为 59 → 成功
3. 传不存在的 documentId → `400 {"error":"所选渠道不存在"}` (QUIZ_021)
4. 不传 `selectedChannelId` 且 `pointChannelId` 为 null → `400 {"error":"必须选择积分充值渠道"}` (QUIZ_020)
5. specific 模式传不在 `channelIds` 里的 documentId → `400 {"error":"所选渠道不在课程所属渠道范围内"}` (QUIZ_018)
6. `zhao_point_records_channel_lnk.channel_id` 字段值为 numeric id（如 59）
7. `zhao_point_records_user_channel_lnk.channel_id` 字段值为 numeric id（保持现有行为）

## 不做的事

- 不改 point 服务（保持纯净，由调用方负责类型转换）
- 不改前端（前端传 documentId 是正确契约）
- 不改 `userChannelId`（已是 numeric id，从 `myCh.channel.id` 直接取）
- 不改 redemption.ts（独立链路，已有转换逻辑）
- 不动 [quiz.ts:282-290](file:///e:/code/basic/plugins/zhao-quiz/server/src/services/quiz.ts#L282-L290) 的 `userChannelId` 字段
- 不重构 `claimQuizPoints` 函数签名

## 风险

- **低**：改动集中在单文件单函数，参考 redemption 已验证范式
- **回归点**：scope 校验从比对 numeric id 改为比对字符串/documentId，可能影响 specific 模式行为
  - 但原比对 `String(numericId) === String(documentId)` 永远 false，说明原校验本身就是 bug
  - 修复后 `channelIds` 数组若存 documentId 则匹配成功；若存 numeric id 则需前端写入时统一为 documentId（不在本任务范围）
