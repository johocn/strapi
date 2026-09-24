# 答题渠道选择弹窗修复设计

**日期:** 2026-07-05
**主题:** video-player 答题领分时渠道选择弹窗未弹出修复
**目标文件:** `e:\code\shao\pages\video-player\video-player.vue`

## 问题背景

在 `video-player.vue` 的答题领分流程中，答题完成后未弹出渠道选择弹窗（`uni.showActionSheet`），而是直接弹出"领取积分"确认框，确认后 backend 报 `QUIZ_020 必须选择积分充值渠道`。

## 根因分析

[video-player.vue:687-689](file:///e:/code/shao/pages/video-player/video-player.vue#L687-L689) 中 `/channels/available` 响应解析多了一层 `.data`：

```js
const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
const channels = (channelRes as any)?.data?.data || []  // 双层 .data 错误
availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]
```

**关键事实**：
- `request` helper（[api.ts:88](file:///e:/code/shao/services/api.ts#L88)）已通过 `resolve(res.data)` 解包 HTTP response 到 body
- `/channels/available` 实际返回 body 结构为 `{ data: [...] }`（外层 `data` 是业务封装字段）
- 所以 `channelRes` = `{ data: [...] }`，`channelRes.data` 就是渠道数组
- `channelRes.data.data` 恒为 `undefined`，导致 `channels = []`，`availableChannelIds = []`

**对比项目约定**：[api.ts](file:///e:/code/shao/services/api.ts) 中 24 处 API 调用都用 `res?.data ?? res`（单层 `.data`），唯独此处用了双层 `.data`，是明显的笔误。

## 影响链路

1. `channelConfig.channelIds = []`（course scope=all）
2. 触发 fetch `/channels/available` → 实际返回 3 个渠道
3. 解析为 `undefined → []`，availableChannelIds 仍为空
4. `needPicker = false`（0 不大于 1）
5. 进入 else 分支 → `doClaim(undefined)`
6. 弹出"领取积分"确认框（非渠道选择器）
7. 确认后 claim-points 不带 selectedChannelId → backend 报 QUIZ_020

## 设计方案

仅修改 [video-player.vue:688](file:///e:/code/shao/pages/video-player/video-player.vue#L688) 一行，去掉一层 `.data`。

### 改动

```js
// 改前
const channels = (channelRes as any)?.data?.data || []

// 改后
const channels = (channelRes as any)?.data || []
```

与项目其他 24 处 `res?.data ?? res` 约定一致。

## 验证链路（修复后预期）

1. `channelConfig.channelIds = []`（course scope=all）
2. 触发 fetch `/channels/available` → 返回 `{ data: [3 个渠道] }`
3. 解析为 3 个渠道 → `availableChannelIds` 长度为 3
4. `needPicker = true`（3 > 1）
5. 弹出 `uni.showActionSheet` 渠道选择器（带 3 个选项 + 默认标记）
6. 用户选择 → `doClaim(selectedChannelId)` → 弹"领取积分"确认框 → claim-points API → 成功返回 `pointsEarned`

## 不做的事

- 不改 `doClaim` 逻辑
- 不改 `needPicker` 判断条件
- 不改 `channelConfig` 加载逻辑
- 不重构到 api.ts 服务函数（YAGNI）
- 不动 [line 480](file:///e:/code/shao/pages/video-player/video-player.vue#L480) 的课时领分 `doClaim`（独立链路）

## 风险评估

- **低风险**: 一行字符串改动，与项目约定一致
- **回归点**: 无，原逻辑解析恒为 `[]`，修复后才能拿到真实渠道
- **测试场景**: 课程 scope=all + 答题完成 → 应弹出渠道选择器（3 个选项）
