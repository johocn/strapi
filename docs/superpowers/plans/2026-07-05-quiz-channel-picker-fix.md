# 答题渠道选择弹窗修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 video-player 答题领分时渠道选择弹窗未弹出的问题

**Architecture:** 修正 `/channels/available` 响应解析的双层 `.data` bug 为单层 `.data`，与项目其他 24 处 `res?.data ?? res` 约定一致

**Tech Stack:** uni-app + Vue 3 + TypeScript

**Spec:** `docs/superpowers/specs/2026-07-05-quiz-channel-picker-fix-design.md`

---

## File Structure

仅修改一个文件：
- `e:\code\shao\pages\video-player\video-player.vue` — 仅 line 688 一行改动

无需新建文件、无需改 template、无需改其他逻辑。

---

## Task 1: 修正 `/channels/available` 响应解析

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:688`

- [ ] **Step 1: 读取当前代码确认行号和内容**

用 Read 工具读取 `e:\code\shao\pages\video-player\video-player.vue` 第 686-690 行
Expected: 看到如下内容
```js
        try {
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data?.data || []
          availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]
```

- [ ] **Step 2: 用 Edit 工具去掉一层 .data**

old_string:
```js
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data?.data || []
```

new_string:
```js
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data || []
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 687-690 行
Expected:
```js
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data || []
          availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]
```

- [ ] **Step 4: 不提交，进入验证 Task**

---

## Task 2: 人工验证答题领分流程

**Files:**
- 无文件改动，浏览器验证

- [ ] **Step 1: 确认 shao dev server 已启动**

确认 `http://localhost:5174` 可访问。如未启动：
```bash
cd e:\code\shao; npm run dev:h5
```

- [ ] **Step 2: 确认后端 `/channels/available` 正常返回**

Run（替换为实际 token）:
```bash
curl.exe -s "http://localhost:1337/api/zhao-common/v1/channels/available" -H "Authorization: Bearer <token>" -w "\nHTTP_CODE:%{http_code}\n"
```

Expected: HTTP 200，返回 `{"data":[{"id":76,"documentId":"xj2d2fq9svv7bmb9vwrxilv8","name":"11115的个人渠道"},{"id":78,"documentId":"b673l54r8cwspm5i1w37extq","name":"1117的个人渠道"},{"id":59,"documentId":"fjd99i9cf0ww324puwyxu1zr","name":"起点"}]}`

如果返回不是 3 个渠道，说明测试用户的渠道范围有变化，不影响修复正确性判断（只要返回非空数组即可）。

- [ ] **Step 3: 浏览器访问答题页**

打开: `http://localhost:5174/#/pages/video-player/video-player?courseId=e3nkbz8dvn1dkmfezfyna7xi&lessonIndex=0`

- [ ] **Step 4: 完成答题触发领分流程**

操作:
1. 点击"开始答题"
2. 答题至全部完成
3. 等待 `setTimeout(300)` 后弹窗出现

Expected（修复后）:
- 弹出 `uni.showActionSheet` 渠道选择器（不是"领取积分"确认框）
- 显示 3 个选项：`xj2d2fq9svv7bmb9vwrxilv8`、`b673l54r8cwspm5i1w37extq`、`fjd99i9cf0ww324puwyxu1zr`
- 不会出现"默认"标记（因为 `channelConfig.pointChannelId` 为 null）

NOT Expected（修复前 bug 行为）:
- 直接弹出"领取积分"确认框（`uni.showModal`）
- 确认后报 `QUIZ_020 必须选择积分充值渠道`

- [ ] **Step 5: 选择渠道后完成领取**

操作: 在 action sheet 中点击任一渠道
Expected:
- action sheet 关闭
- 弹出"领取积分"确认框：`答对X/Y题，可获得100积分，是否领取？`
- 点击"确定"后弹出 toast：`获得100积分！`
- header 积分余额增加 100

- [ ] **Step 6: 验证失败时回滚**

如未弹出渠道选择器，检查：
1. 浏览器 console 是否有 `[获取可用渠道失败]` 警告
2. 用 Read 工具确认 `e:\code\shao\pages\video-player\video-player.vue:688` 改动已生效
3. 如改动未生效或仍有问题，用 `git -C e:\code diff shao/pages/video-player/video-player.vue` 检查

Expected: 步骤 4-5 全部通过

---

## Task 3: 提交变更

**Files:**
- Commit: `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: 检查 shao 是否在 git 仓库中**

Run:
```bash
git -C e:\code status --short shao/pages/video-player/video-player.vue
```

- 如显示 `?? shao/...` 表示 shao 是未跟踪目录，跳过 git 提交，直接保存文件即可。
- 如显示 ` M shao/...` 表示已跟踪，继续 Step 2。

- [ ] **Step 2: 提交（仅当 shao 已被 git 跟踪时）**

```bash
git -C e:\code add shao/pages/video-player/video-player.vue
git -C e:\code commit -m "fix(shao): 修复答题渠道选择弹窗未弹出

/channels/available 响应解析多了一层 .data，导致 channels 恒为空数组，
needPicker 恒为 false，渠道选择器不弹出。"
```

Expected: commit 成功

- [ ] **Step 3: 完成**

修复任务全部完成。
