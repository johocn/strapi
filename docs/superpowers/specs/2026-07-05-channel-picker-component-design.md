# 渠道选择弹窗组件化设计

**日期:** 2026-07-05
**主题:** 将 video-player 答题领分渠道选择弹窗拆分为 ChannelPicker 组件
**目标文件:**
- 新建: `e:\code\shao\components\channel-picker.vue`
- 修改: `e:\code\shao\pages\video-player\video-player.vue`

## 问题背景

[video-player.vue:724-738](file:///e:/code/shao/pages/video-player/video-player.vue#L724-L738) 当前用 `uni.showActionSheet` 实现渠道选择，存在以下问题：

1. **无标题**：action sheet 无法显示"选择积分充值渠道"标题
2. **显示 id 而非 name**：line 689 仅保存 `documentId` 丢弃了 `name` 字段，line 727 用 id 当 label
3. **无取消/确定按钮**：action sheet 点击即提交，无法反悔改选
4. **无滚动兜底**：渠道数 ≥ 6 时 action sheet 不可滚动
5. **二次确认冗余**：选渠道后还弹"领取积分"确认框，多一步交互

同时 video-player.vue 文件已达 1231 行 / 34KB，职责过多（视频播放+课时列表+答题+渠道选择+课时领分），需拆分。

## 设计方案

### 范围
- 新建 `components/channel-picker.vue`（kebab-case，遵循 components 目录约定）
- 修改 `pages/video-player/video-player.vue` 替换 action sheet 调用
- 不拆 QuizModal、不动课时领分 doClaim、不改后端 API

### ChannelPicker 组件设计

**Props**:
```ts
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

interface Props {
  visible: boolean           // v-model:visible
  channels: ChannelItem[]
  defaultDocId?: string      // pointChannelId 对应 documentId（默认选中）
  quizInfo?: QuizInfo        // 顶部展示信息
}
```

**Emits**:
```ts
const emit = defineEmits<{
  'update:visible': [val: boolean]
  confirm: [selectedDocId: string]   // 确定选择
  cancel: []                          // 取消（放弃领取）
}>()
```

**组件内部状态**:
- `selectedDocId` — 当前选中，`watch(props.visible)` 为 true 时初始化为 `defaultDocId`

**组件 Template 结构**:
```html
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
        <text v-if="ch.documentId === defaultDocId" class="picker-default-tag">默认</text>
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
```

**组件方法**:
```ts
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

watch(() => props.visible, (val) => {
  if (val) {
    selectedDocId.value = props.defaultDocId || null
  }
})
```

**组件 Style**: 见实施计划（参考现有 `.quiz-overlay`/`.quiz-modal` 风格，z-index: 1100 高于 quiz-overlay 1000）

### video-player.vue 改造

**Script 新增**:
```ts
import ChannelPicker from '../../components/channel-picker.vue'

const showChannelPicker = ref(false)
const channelPickerList = ref<any[]>([])
const pendingClaimTotal = ref(0)
```

**数据结构改造**（line 675-694）:
```ts
// 改前
let availableChannelIds: any[] = []
if (channelConfig.value && Array.isArray(channelConfig.value.channelIds)) {
  availableChannelIds = channelConfig.value.channelIds
}
// ...
const channels = (channelRes as any)?.data || []
availableChannelIds = [...new Set(channels.map((c: any) => c.documentId))]

// 改后
let availableChannels: any[] = []
if (channelConfig.value && Array.isArray(channelConfig.value.channelIds)) {
  availableChannels = (channelConfig.value.channelIds || []).map((id: any) => ({
    documentId: id,
    name: id,  // specific 模式 fallback 显示 id
    id
  }))
}
// ...
const channels = (channelRes as any)?.data || []
availableChannels = [...new Map(channels.map((c: any) => [c.documentId, c])).values()]  // 去重保留对象
```

**调用链路替换**（line 696-743）:
```ts
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
```

**移除**: 原 `doClaim` 闭包（line 698-722）和 `uni.showActionSheet` 调用（line 724-738）

**新增 claimWithChannel 函数**（从原 doClaim 提取，去掉 `uni.showModal` 二次确认）:
```ts
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

**Template 新增**（line 135 前，`</template>` 前）:
```html
<ChannelPicker
  v-model:visible="showChannelPicker"
  :channels="channelPickerList"
  :default-doc-id="String(channelConfig?.pointChannelId ?? '')"
  :quiz-info="{ successCount: quizSuccessCount, totalCount: questions.length, earnedPoints: pendingClaimTotal }"
  @confirm="onChannelConfirm"
  @cancel="onChannelCancel"
/>
```

## 验证场景

| 场景 | 预期行为 |
|------|----------|
| 多渠道（≥2） | ChannelPicker 弹出，默认选中 pointChannelId 对应项，可改选，确定后直接领取（无二次确认） |
| 单渠道 | 不弹组件，直接调 claimWithChannel 领取 |
| 渠道数 ≥ 6 | scroll-view 出现滚动条，header/footer 固定 |
| 取消 | toast "已取消领取"，积分余额不变 |
| 无选中点确定 | 组件内 toast "请选择积分充值渠道"，不关闭弹窗 |
| pointChannelId 为 null | 默认不选，需手动选后才能点确定 |

## 不做的事

- 不拆 QuizModal（仅拆 ChannelPicker）
- 不动 [line 480](file:///e:/code/shao/pages/video-player/video-player.vue#L480) 的课时领分 doClaim（独立链路）
- 不改 quiz.vue 的同类 action sheet（独立任务）
- 不改后端 API

## 风险评估

- **低风险**: 新建独立组件，不影响现有逻辑；调用方改动集中在 line 696-743
- **回归点**: availableChannels 数据结构从 id 字符串改为对象数组，需确认所有使用点已更新
- **组件通信**: v-model:visible 双向绑定 + confirm/cancel 事件，符合 Vue 3 conventions
