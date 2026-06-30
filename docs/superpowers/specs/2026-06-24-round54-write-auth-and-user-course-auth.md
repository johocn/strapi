# 第 54 轮：P0 写操作越权修复 + user-course-auth 过滤

## 背景

R53 完成读操作渠道过滤，但写操作（create/update/delete/adminAdjust 等）均未校验渠道归属，存在越权风险。本轮修复 P0 写操作（7 个）+ user-course-auth 过滤（4 个）。P1 写操作和 quiz-record 间接过滤留下一轮。

## 任务 1：P0 写操作越权修复

### point-admin.ts（5 个方法）

#### adminAdjust / batchAdjust
- 校验目标 userId 所属 channel 与 channelScope 的交集
- 调用 `strapi.plugin("zhao-channel").service("channel-permission").getUserAllChannels(userId)` 获取用户 channel id 集合
- 与 `scope.channelIds` 求交集，无交集抛 403
- batchAdjust 限制单次批量 ≤100，遍历校验每项

#### adjustStock
- 先查目标商品 documentId 的 channel 字段
- `assertInScope(ctx, record, "channel")`

#### createProduct
- `body.channel` 为 documentId，先 `findOne({documentId})` 取 channel.id
- `assertInScope(ctx, {id}, "id")`

#### updateRedemption
- 先查目标兑换记录 documentId 的 channel
- `assertInScope(ctx, record, "channel")`

### channel.ts（1 个方法）

#### adminCreate
- `body.parentChannel` 存在时，查该 parentChannel 的 id
- `assertInScope(ctx, {id}, "id")`
- 无 parentChannel（创建根渠道）依赖 policy 限制，控制器层不校验

### channel-member.ts（1 个方法）

#### create
- `body.channelId` 为 documentId，查 channel.id
- `assertInScope(ctx, {id}, "id")`

## 任务 3：user-course-auth 过滤

### user-course-auth.ts（4 个方法）

| 方法 | 改造 |
|---|---|
| find | 注入 `channelFilter(ctx, "channel")` 到查询条件 |
| findOne | 查记录后 `assertInScope(record, "channel")` |
| grant | 校验 `body.channel`（documentId）对应的 channel.id 在 scope 内 |
| revoke | 先查目标记录的 channel，`assertInScope` |

复用 R53 模式：控制器顶部加 `_scopeSvc`/`_channelFilter`/`_assertInScope` helper。

## 风险点

1. **adminAdjust/batchAdjust 性能**：每个目标用户查 user-channel 关系。batchAdjust 限制 ≤100。
2. **body.channel 为 documentId**：需先 findOne 取 id 再校验，增加一次查询。
3. **user-course-auth grant 的 body.channel 可能为空**：无 channel 字段时放行（兼容旧逻辑）。

## 不在本轮范围

- 任务 2：P1 写操作越权修复（13 个方法）
- 任务 4：quiz publicRoute + quiz-record/quiz-exam-attempt 间接过滤
