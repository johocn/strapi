# 测验弹窗滚动修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 video-player 测验弹窗选项过多时 footer 按钮被遮挡、无滚动条的问题

**Architecture:** 将 `.quiz-modal` 改为 flex 列布局，`.quiz-header`/`.quiz-footer` 用 `flex-shrink: 0` 固定，`.quiz-content` 用 `flex: 1` + `overflow-y: auto` 替代硬编码 calc；同时紧凑化 `.option-item` 间距以优化 6 选项场景视觉

**Tech Stack:** uni-app + Vue 3 + CSS flexbox

**Spec:** `docs/superpowers/specs/2026-07-05-quiz-modal-scroll-fix-design.md`

---

## File Structure

仅修改一个文件：
- `e:\code\shao\pages\video-player\video-player.vue` — 仅 `<style>` 段，5 处 CSS 改动

无需新建文件、无需改 template、无需改 `<script>`。

---

## Task 1: `.quiz-modal` 改为 flex 列布局

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:995-1001`

- [ ] **Step 1: 读取当前样式确认行号**

Run: 用 Read 工具读取 `e:\code\shao\pages\video-player\video-player.vue` 第 995-1001 行
Expected: 看到如下内容
```css
.quiz-modal {
  width: 90%;
  max-height: 90vh;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}
```

- [ ] **Step 2: 用 Edit 工具添加 flex 属性**

old_string:
```css
.quiz-modal {
  width: 90%;
  max-height: 90vh;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}
```

new_string:
```css
.quiz-modal {
  width: 90%;
  max-height: 90vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

- [ ] **Step 3: 不提交，继续下一个 Task**

---

## Task 2: `.quiz-header` 固定不被压缩

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:1003-1009`

- [ ] **Step 1: 用 Edit 工具添加 flex-shrink**

old_string:
```css
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
```

new_string:
```css
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
```

- [ ] **Step 3: 不提交，继续下一个 Task**

---

## Task 3: `.quiz-content` 用 flex:1 替代硬编码 calc

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:1022-1026`

- [ ] **Step 1: 用 Edit 工具替换 max-height 为 flex:1**

old_string:
```css
.quiz-content {
  padding: 30rpx;
  max-height: calc(90vh - 200rpx);
  overflow-y: auto;
}
```

new_string:
```css
.quiz-content {
  padding: 30rpx;
  flex: 1;
  overflow-y: auto;
}
```

- [ ] **Step 2: 不提交，继续下一个 Task**

---

## Task 4: `.quiz-footer` 固定不被压缩

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:1152-1155`

- [ ] **Step 1: 用 Edit 工具添加 flex-shrink**

old_string:
```css
.quiz-footer {
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
}
```

new_string:
```css
.quiz-footer {
  padding: 30rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}
```

- [ ] **Step 2: 不提交，继续下一个 Task**

---

## Task 5: `.option-item` 紧凑化（6 选项场景）

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:1044-1050`

- [ ] **Step 1: 用 Edit 工具缩小 padding 和 margin-bottom**

old_string:
```css
.option-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 15rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
```

new_string:
```css
.option-item {
  display: flex;
  align-items: center;
  padding: 18rpx;
  margin-bottom: 10rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
```

注意：只改这两行，不动后续的 `&.selected` / `&.correct` / `&.wrong` 嵌套规则。

- [ ] **Step 2: 不提交，进入验证 Task**

---

## Task 6: 人工验证 3 个场景

**Files:**
- 无文件改动，浏览器验证

- [ ] **Step 1: 确认 shao dev server 已启动**

确认 `http://localhost:5174` 可访问。如未启动：
```bash
cd e:\code\shao; npm run dev:h5
```

- [ ] **Step 2: 浏览器访问 4 选项题目场景**

打开: `http://localhost:5174/#/pages/video-player/video-player?courseId=e3nkbz8dvn1dkmfezfyna7xi&lessonIndex=0`

操作: 点击"开始答题" → 答题至弹出 quiz modal

Expected:
- quiz modal 正常显示
- 选项视觉与改动前无显著差异（padding 微调不影响）
- footer 的"提交答案"按钮完整可见可点击
- 无滚动条出现

- [ ] **Step 3: 浏览器验证 6 选项场景**

如当前课程题目不足 6 选项，可在后台将某题目选项扩展到 6 个，或临时本地构造测试数据。

Expected:
- content 区域出现垂直滚动条
- 滚动选项列表时，header 和 footer 保持固定不动
- footer 的操作按钮始终完整可见可点击
- 选项间距比改动前更紧凑但可读

- [ ] **Step 4: 验证 H5 滚动惯性**

在 6 选项场景下用鼠标滚轮或触摸滑动 content 区域。

Expected:
- 滚动顺滑，无卡顿
- 滚动到底部时 footer 不被遮挡
- 滚动到顶部时 header 不被遮挡

- [ ] **Step 5: 验证失败时回滚**

如任意场景不符合预期，用 `git -C e:\code diff shao/pages/video-player/video-player.vue` 检查改动，或用 `git -C e:\code checkout -- shao/pages/video-player/video-player.vue` 回滚后重新调试。

Expected: 所有场景验证通过

---

## Task 7: 提交变更

**Files:**
- Commit: `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: 检查 shao 是否在 git 仓库中**

Run:
```bash
git -C e:\code status --short shao/pages/video-player/video-player.vue
```

如显示 `?? shao/...` 表示 shao 是未跟踪目录（e:\code 仓库未纳入 shao），则跳过 git 提交，直接保存文件即可。

如显示 ` M shao/...` 表示已跟踪，继续 Step 2。

- [ ] **Step 2: 提交（仅当 shao 已被 git 跟踪时）**

```bash
git -C e:\code add shao/pages/video-player/video-player.vue
git -C e:\code commit -m "fix(shao): 修复测验弹窗选项过多时 footer 被遮挡

- quiz-modal 改为 flex 列布局
- quiz-header/footer 用 flex-shrink:0 固定
- quiz-content 用 flex:1 替代硬编码 calc
- option-item 紧凑化 padding/margin 适配 6 选项场景"
```

Expected: commit 成功

- [ ] **Step 3: 完成**

修复任务全部完成。
