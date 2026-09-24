# 渠道选择弹窗组件化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 video-player 答题领分渠道选择从 `uni.showActionSheet` 替换为独立的 ChannelPicker 组件，支持标题、name 显示、单选+确定、滚动兜底

**Architecture:** 新建 `components/channel-picker.vue`（自包含 modal + 单选列表 + 底部双按钮），video-player.vue 通过 v-model:visible + confirm/cancel 事件调用；同时修复 `/channels/available` 响应解析的 `.data` bug，并将 `availableChannelIds: string[]` 改为 `availableChannels: {documentId, name, id}[]`

**Tech Stack:** uni-app + Vue 3 Composition API + TypeScript + SCSS

**Spec:** `docs/superpowers/specs/2026-07-05-channel-picker-component-design.md`

---

## File Structure

- **Create**: `e:\code\shao\components\channel-picker.vue` — 渠道选择弹窗组件，kebab-case 命名遵循 components 目录约定
- **Modify**: `e:\code\shao\pages\video-player\video-player.vue` — 引入组件 + 替换 action sheet 调用 + 修复 .data 解析 + 数据结构改造

ChannelPicker 组件自包含 props/emits/state/style，无外部依赖；video-player.vue 仅作调用方。

---

## Task 1: 创建 ChannelPicker 组件文件

**Files:**
- Create: `e:\code\shao\components\channel-picker.vue`

- [ ] **Step 1: 用 Write 工具创建组件文件**

文件完整内容：

```vue
<template>
  <view v-if="visible" class="channel-picker-overlay" @click="onCancel">
    <view class="channel-picker-modal" @click.stop>
      <view class="picker-header">
        <text class="picker-title">选择积分充值渠道</text>
        <view class="picker-close" @click="onCancel">✕</view>
      </view>
      <view v-if="quizInfo" class="picker-info">
        <text>答对 {{ quizInfo.successCount }}/{{ quizInfo.totalCount }} 题，可获得 {{ quizInfo.earnedPoints }} 积分</text>
      </view>
      <scroll-view scroll-y class="picker-list">
        <view
          v-for="ch in channels"
          :key="ch.documentId"
          :class="['picker-option', { selected: selectedDocId === ch.documentId }]"
          @click="selectChannel(ch.documentId)"
        >
          <text class="picker-radio"></text>
          <text class="picker-option-name">{{ ch.name }}</text>
          <text v-if="ch.documentId === defaultDocId && defaultDocId" class="picker-default-tag">默认</text>
        </view>
      </scroll-view>
      <view class="picker-footer">
        <view class="picker-btn picker-cancel" @click="onCancel">
          <text>取消</text>
        </view>
        <view
          :class="['picker-btn', 'picker-confirm', { disabled: !selectedDocId }]"
          @click="onConfirm"
        >
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface ChannelItem {
  documentId: string
  name: string
  id?: number
}

interface QuizInfo {
  successCount: number
  totalCount: number
  earnedPoints: number
}

const props = defineProps<{
  visible: boolean
  channels: ChannelItem[]
  defaultDocId?: string
  quizInfo?: QuizInfo
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  confirm: [selectedDocId: string]
  cancel: []
}>()

const selectedDocId = ref<string | null>(null)

watch(() => props.visible, (val) => {
  if (val) {
    selectedDocId.value = props.defaultDocId || null
  }
})

function selectChannel(docId: string) {
  selectedDocId.value = docId
}

function onCancel() {
  emit('cancel')
  emit('update:visible', false)
}

function onConfirm() {
  if (!selectedDocId.value) {
    uni.showToast({ title: '请选择积分充值渠道', icon: 'none' })
    return
  }
  emit('confirm', selectedDocId.value)
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.channel-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.channel-picker-modal {
  width: 90%;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: bold;
}

.picker-close {
  font-size: 36rpx;
  color: #999;
  padding: 10rpx;
}

.picker-info {
  padding: 20rpx 30rpx;
  background: #f8f9ff;
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}

.picker-list {
  flex: 1;
  max-height: 50vh;
}

.picker-option {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &.selected {
    .picker-radio {
      background: #667eea;
      border-color: #667eea;

      &::after {
        content: '✓';
        color: #fff;
        font-size: 24rpx;
      }
    }
  }
}

.picker-radio {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #d9d9d9;
  border-radius: 50%;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
}

.picker-option-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.picker-default-tag {
  font-size: 22rpx;
  color: #667eea;
  background: #f8f9ff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 10rpx;
}

.picker-footer {
  display: flex;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.picker-btn {
  flex: 1;
  padding: 24rpx;
  text-align: center;
  font-size: 30rpx;
}

.picker-cancel {
  color: #666;
  border-right: 1rpx solid #f0f0f0;
}

.picker-confirm {
  color: #fff;
  background: #667eea;
  font-weight: bold;

  &.disabled {
    background: #c5cad3;
  }
}
</style>
```

- [ ] **Step 2: 用 Read 工具确认文件创建成功**

读取 `e:\code\shao\components\channel-picker.vue` 第 1-10 行
Expected: 看到 `<template>` 和 `channel-picker-overlay` 类名

- [ ] **Step 3: 不提交，继续下一个 Task**

---

## Task 2: video-player.vue 引入组件 + 新增状态

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:139-141`（import 区域）和 script setup 内

- [ ] **Step 1: 用 Read 工具确认 import 行**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 139-142 行
Expected:
```ts
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getCourseDetail, getLessonList, getMyLessonProgresses, submitLessonProgress, startQuiz as apiStartQuiz, checkQuizAnswer, claimQuizPoints, submitQuizAnswer, getPointBalance, getPointFeatureFlags, getPointRecordList, claimLessonPoints, request } from '../../services/api'
import { getStoredAuthConfig } from '../../services/auth-config'
import type { Course, Lesson, QuizQuestion } from '../../services/api'
```

- [ ] **Step 2: 用 Edit 工具添加 ChannelPicker import**

old_string:
```ts
import { getStoredAuthConfig } from '../../services/auth-config'
import type { Course, Lesson, QuizQuestion } from '../../services/api'
```

new_string:
```ts
import { getStoredAuthConfig } from '../../services/auth-config'
import type { Course, Lesson, QuizQuestion } from '../../services/api'
import ChannelPicker from '../../components/channel-picker.vue'
```

- [ ] **Step 3: 用 Edit 工具添加状态变量**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 173-175 行确认：
```ts
const featureFlagChannelCrossPoints = ref(false)
const channelConfig = ref<any>(null)
```

在 line 174（`const channelConfig = ref<any>(null)`）后插入：

old_string:
```ts
const featureFlagChannelCrossPoints = ref(false)
const channelConfig = ref<any>(null)
```

new_string:
```ts
const featureFlagChannelCrossPoints = ref(false)
const channelConfig = ref<any>(null)

// 渠道选择弹窗
const showChannelPicker = ref(false)
const channelPickerList = ref<any[]>([])
const pendingClaimTotal = ref(0)
```

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 3: 修复 .data 解析 + 数据结构改造

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:675-694`

- [ ] **Step 1: 用 Read 工具确认当前代码**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 674-694 行
Expected:
```js
  setTimeout(async () => {
    let availableChannelIds: any[] = []
    
    if (channelConfig.value && Array.isArray(channelConfig.value.channelIds)) {
      availableChannelIds = channelConfig.value.channelIds
    }
    
    if (availableChannelIds.length === 0) {
      const shouldFetchAvailable =
        channelConfig.value?.channelScope === 'all' ||
        (channelConfig.value?.channelScope === 'specific' && availableChannelIds.length === 0)
      if (shouldFetchAvailable) {
        try {
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data?.data || []
          availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]
        } catch (e) {
          console.warn('[获取可用渠道失败]', e)
        }
      }
    }
```

- [ ] **Step 2: 用 Edit 工具替换数据结构 + 修复 .data 解析**

old_string:
```js
    let availableChannelIds: any[] = []
    
    if (channelConfig.value && Array.isArray(channelConfig.value.channelIds)) {
      availableChannelIds = channelConfig.value.channelIds
    }
    
    if (availableChannelIds.length === 0) {
      const shouldFetchAvailable =
        channelConfig.value?.channelScope === 'all' ||
        (channelConfig.value?.channelScope === 'specific' && availableChannelIds.length === 0)
      if (shouldFetchAvailable) {
        try {
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data?.data || []
          availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]
        } catch (e) {
          console.warn('[获取可用渠道失败]', e)
        }
      }
    }
```

new_string:
```js
    let availableChannels: any[] = []
    
    if (channelConfig.value && Array.isArray(channelConfig.value.channelIds)) {
      // specific 模式：channelIds 是 id 数组，fallback name 显示 id
      availableChannels = (channelConfig.value.channelIds || []).map((id: any) => ({
        documentId: id,
        name: id,
        id
      }))
    }
    
    if (availableChannels.length === 0) {
      const shouldFetchAvailable =
        channelConfig.value?.channelScope === 'all' ||
        (channelConfig.value?.channelScope === 'specific' && availableChannels.length === 0)
      if (shouldFetchAvailable) {
        try {
          const channelRes = await request('/zhao-common/v1/channels/available', { method: 'GET' })
          const channels = (channelRes as any)?.data || []
          // 去重保留完整对象
          availableChannels = [...new Map(channels.map((c: any) => [c.documentId, c])).values()]
        } catch (e) {
          console.warn('[获取可用渠道失败]', e)
        }
      }
    }
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 674-696 行
Expected: 看到 `let availableChannels: any[] = []` 和 `?.data || []`（单层 .data）

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 4: 替换 action sheet 调用为 ChannelPicker 调用

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:696-743`（doClaim 闭包 + action sheet 调用）

- [ ] **Step 1: 用 Read 工具确认当前代码**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 696-744 行
Expected: 看到 `const needPicker = availableChannelIds.length > 1`、`const doClaim = async`、`uni.showActionSheet` 等代码

- [ ] **Step 2: 用 Edit 工具替换调用链路**

old_string:
```js
    const needPicker = availableChannelIds.length > 1

    const doClaim = async (selectedChannelId?: number | string) => {
      uni.showModal({
        title: '领取积分',
        content: `答对${quizSuccessCount.value}/${questions.value.length}题，可获得${totalEarned}积分，是否领取？`,
        success: async (res) => {
          if (!res.confirm || !courseDocumentId.value) {
            return
          }
          try {
            const claimRes = await claimQuizPoints({
              courseDocumentId: courseDocumentId.value!,
              totalEarnedPoints: totalEarned,
              lessonDocumentId: currentLesson.value?.documentId,
              selectedChannelId,
            })
            const earned = (claimRes as any)?.pointsEarned || 0
            pointsBalance.value += earned
            uni.showToast({ title: `获得${earned}积分！`, icon: 'success' })
          } catch (e: any) {
            const errMsg = (e as any)?.error || '积分领取失败'
            uni.showToast({ title: errMsg, icon: 'none' })
          }
        }
      })
    }

    if (needPicker) {
      const labels = availableChannelIds.map((id) => {
        const isDefault = String(id) === String(channelConfig.value?.pointChannelId)
        return `${id}${isDefault ? '（默认）' : ''}`
      })
      uni.showActionSheet({
        itemList: labels,
        success: (res) => {
          const picked = availableChannelIds[res.tapIndex]
          doClaim(picked)
        },
        fail: () => {
          doClaim(channelConfig.value.pointChannelId ?? undefined)
        }
      })
    } else if (availableChannelIds.length === 1) {
      doClaim(availableChannelIds[0])
    } else {
      doClaim(channelConfig.value?.pointChannelId ?? undefined)
    }
  }, 300)
}
```

new_string:
```js
    const needPicker = availableChannels.length > 1

    if (needPicker) {
      channelPickerList.value = availableChannels
      pendingClaimTotal.value = totalEarned
      showChannelPicker.value = true
    } else if (availableChannels.length === 1) {
      await claimWithChannel(availableChannels[0].documentId, totalEarned)
    } else {
      uni.showToast({ title: '无可选渠道', icon: 'none' })
    }
  }, 300)
}

async function claimWithChannel(selectedChannelId: string, totalEarned: number) {
  try {
    const claimRes = await claimQuizPoints({
      courseDocumentId: courseDocumentId.value!,
      totalEarnedPoints: totalEarned,
      lessonDocumentId: currentLesson.value?.documentId,
      selectedChannelId,
    })
    const earned = (claimRes as any)?.pointsEarned || 0
    pointsBalance.value += earned
    uni.showToast({ title: `获得${earned}积分！`, icon: 'success' })
  } catch (e: any) {
    const errMsg = (e as any)?.error || '积分领取失败'
    uni.showToast({ title: errMsg, icon: 'none' })
  }
}

async function onChannelConfirm(selectedDocId: string) {
  await claimWithChannel(selectedDocId, pendingClaimTotal.value)
}

function onChannelCancel() {
  uni.showToast({ title: '已取消领取', icon: 'none' })
}
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 696-730 行
Expected: 看到 `availableChannels.length`、`channelPickerList.value =`、`claimWithChannel` 函数定义，不再有 `uni.showActionSheet` 和 `uni.showModal`

- [ ] **Step 4: 不提交，继续下一个 Task**

---

## Task 5: Template 引入 ChannelPicker 组件

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue:134-136`（`</view>` + `</template>` 前）

- [ ] **Step 1: 用 Read 工具确认当前代码**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 127-136 行
Expected:
```html
    <view class="bottom-bar">
      <view class="action-btn secondary" @click="goBack">
        <text>返回课程</text>
      </view>
      <view :class="['action-btn', 'primary', { disabled: todayQuizCount >= maxDailyQuiz }]" @click="startQuiz">
        <text>{{ todayQuizCount >= maxDailyQuiz ? '今日答题已达上限' : '开始答题' }}</text>
      </view>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 用 Edit 工具在 `</view></template>` 前插入组件**

old_string:
```html
    <view class="bottom-bar">
      <view class="action-btn secondary" @click="goBack">
        <text>返回课程</text>
      </view>
      <view :class="['action-btn', 'primary', { disabled: todayQuizCount >= maxDailyQuiz }]" @click="startQuiz">
        <text>{{ todayQuizCount >= maxDailyQuiz ? '今日答题已达上限' : '开始答题' }}</text>
      </view>
    </view>
  </view>
</template>
```

new_string:
```html
    <view class="bottom-bar">
      <view class="action-btn secondary" @click="goBack">
        <text>返回课程</text>
      </view>
      <view :class="['action-btn', 'primary', { disabled: todayQuizCount >= maxDailyQuiz }]" @click="startQuiz">
        <text>{{ todayQuizCount >= maxDailyQuiz ? '今日答题已达上限' : '开始答题' }}</text>
      </view>
    </view>

    <ChannelPicker
      v-model:visible="showChannelPicker"
      :channels="channelPickerList"
      :default-doc-id="String(channelConfig?.pointChannelId ?? '')"
      :quiz-info="{ successCount: quizSuccessCount, totalCount: questions.length, earnedPoints: pendingClaimTotal }"
      @confirm="onChannelConfirm"
      @cancel="onChannelCancel"
    />
  </view>
</template>
```

- [ ] **Step 3: 用 Read 工具确认改动**

读取 `e:\code\shao\pages\video-player\video-player.vue` 第 127-142 行
Expected: 看到 `<ChannelPicker` 标签及其属性

- [ ] **Step 4: 不提交，进入验证 Task**

---

## Task 6: 人工浏览器验证

**Files:**
- 无文件改动，浏览器验证

- [ ] **Step 1: 确认 shao dev server 已启动**

确认 `http://localhost:5174` 可访问。如未启动：
```bash
cd e:\code\shao; npm run dev:h5
```

- [ ] **Step 2: 浏览器访问答题页**

打开: `http://localhost:5174/#/pages/video-player/video-player?courseId=e3nkbz8dvn1dkmfezfyna7xi&lessonIndex=0`

- [ ] **Step 3: 完成答题触发渠道选择**

操作:
1. 点击"开始答题"
2. 答题至全部完成
3. 等待 `setTimeout(300)` 后弹窗出现

Expected（修复后）:
- 弹出 ChannelPicker 自定义弹窗（不是 `uni.showActionSheet` 原生底部弹出）
- 弹窗顶部显示"选择积分充值渠道"标题
- 标题下方显示"答对 X/Y 题，可获得 N 积分"信息条
- 中间列表显示 3 个渠道，**显示 name**（"11115的个人渠道"、"1117的个人渠道"、"起点"），不是 documentId
- 每个 option 左侧有圆形 radio，无选中时为空，选中时填充蓝色 + ✓
- 列表区无滚动条（3 个渠道不超 50vh）
- 底部"取消"/"确定"按钮并排，确定按钮默认蓝色（pointChannelId 为 null 时无选中，确定按钮灰色 disabled）

NOT Expected（修复前 bug 行为）:
- 直接弹出 `uni.showActionSheet` 底部原生选择器
- 显示 documentId 而非 name
- 直接弹出"领取积分"确认框（`uni.showModal`）

- [ ] **Step 4: 验证选择 + 确定流程**

操作:
1. 点击任一渠道 option → radio 变为蓝色填充 + ✓
2. 确定按钮变蓝色高亮
3. 点击"确定"按钮

Expected:
- 弹窗关闭
- toast 显示 `获得100积分！`
- header 积分余额增加 100

- [ ] **Step 5: 验证取消流程**

操作: 重新答题至弹出 ChannelPicker → 点击"取消"按钮 或 点击遮罩区域

Expected:
- 弹窗关闭
- toast 显示 `已取消领取`
- 积分余额不变

- [ ] **Step 6: 验证无选中点确定**

操作: 重新答题至弹出 ChannelPicker（如 pointChannelId 为 null，默认无选中）→ 直接点"确定"

Expected:
- toast 显示 `请选择积分充值渠道`
- 弹窗不关闭

- [ ] **Step 7: 验证失败时回滚**

如任意场景不符合预期：
1. 浏览器 console 检查是否有报错（如 ChannelPicker import 失败、`channelPickerList` undefined 等）
2. 用 Read 工具确认 Task 1-5 改动全部生效
3. 必要时用 `git -C e:\code diff shao/` 检查改动

Expected: 步骤 3-6 全部通过

---

## Task 7: 提交变更

**Files:**
- Commit: `e:\code\shao\components\channel-picker.vue` + `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: 检查 shao 是否在 git 仓库中**

Run:
```bash
git -C e:\code status --short shao/components/channel-picker.vue shao/pages/video-player/video-player.vue
```

- 如显示 `?? shao/...` 表示 shao 是未跟踪目录，跳过 git 提交。
- 如显示 ` M shao/...` 或 `?? shao/components/channel-picker.vue` 单独未跟踪，继续 Step 2。

- [ ] **Step 2: 提交（仅当 shao 已被 git 跟踪时）**

```bash
git -C e:\code add shao/components/channel-picker.vue shao/pages/video-player/video-player.vue
git -C e:\code commit -m "feat(shao): 拆分 ChannelPicker 组件 + 修复渠道选择弹窗

- 新建 components/channel-picker.vue 自定义弹窗组件
  - 支持标题、name 显示、单选 radio + 确定按钮
  - scroll-view 兜底渠道过多时滚动
  - v-model:visible + confirm/cancel 事件
- video-player.vue 替换 uni.showActionSheet 为 ChannelPicker
- 修复 /channels/available 响应解析 .data?.data -> .data
- availableChannelIds 改为 availableChannels 保留完整对象
- 去掉选渠道后的二次确认框"
```

Expected: commit 成功

- [ ] **Step 3: 完成**

修复任务全部完成。
