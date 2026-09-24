# 剧本活动沉浸剧情引擎实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把剧本活动"平安钟楼"站升级为沉浸剧情（对白+输入+连点敲钟+悬疑分支+线索掉落），并搭好可复用引擎，完成后复用原打卡积分闭环。

**Architecture:** 剧本 `scenes` 数据前端内置（`shao/data/tour-scenes.ts`），进度存 localStorage，剧场层在 `shao/pages/activity/tour.vue` 播放。走完剧情调用**现有后端** **`tourCheckinStation`**（幂等发分+标记完成，后端零改动，无需重建/重启 dist）。

**Tech Stack:** uni-app（H5, `shao`）、Vue 3 `<script setup>`、TypeScript；无新增依赖（web/shao 禁装依赖）。

***

> **定稿说明（相对 spec）**：spec 5.2/5.3 对"进度持久化到后端 tourProgress 还是前端 colon"存在口径歧义。本计划定稿为：故事状态全存前端 localStorage（`tour_story_<documentId>`），后端 `zhao-point` 不改任何代码 → 无需 `npm run build`/部署/重启，最低风险。后端清理逻辑无需新增。

### Task 1: 剧本数据文件 `tour-scenes.ts`

**Files:**

- Create: `shao/data/tour-scenes.ts`

- [ ] **Step 1: 创建剧本类型与平安钟楼** **`scenes`**

数据文件承载五类节点（narrative 对白 / input 心愿匣 / tap 连点敲钟 / choice 分支 / settle 收束+线索），key 为站点 order 字符串（平安钟楼 = `'1'`）。

```ts
export type TourNode =
  | { type: 'narrative'; speaker?: string; text: string }
  | { type: 'input'; key: 'wish'; placeholder: string }
  | { type: 'tap'; target: number; rings: string[] }
  | { type: 'choice'; options: { id: string; label: string; note: string }[] }
  | { type: 'settle'; relic: string }

export interface StationScript {
  stationId: number
  title: string
  nodes: TourNode[]
}

export const THREES_RINGS = [
  '第一声：愿你所想，皆有所归。',
  '第二声：愿你牵挂，都不必隐忍。',
  '第三声：愿这一愿，替你传到了。',
]

export const PINGAN_SCRIPT: StationScript = {
  stationId: 1,
  title: '平安钟楼 · 三声钟一人愿',
  nodes: [
    { type: 'narrative', text: '北山七处福气落锁，钥匙藏在同行人里。你的第一个落锁点，是这口平安钟。' },
    { type: 'narrative', speaker: '守钟人', text: '钟有三响。第一响，是替谁许的？' },
    { type: 'input', key: 'wish', placeholder: '写下你在乎的人，或想护的人' },
    { type: 'tap', target: 3, rings: THREES_RINGS },
    { type: 'narrative', speaker: '钟之回声', text: '钟声把你的话带走了……只是，三响里混进了别人的第四声。这钟，曾被七个人敲出过七种下落。' },
    {
      type: 'choice',
      options: [
        { id: 'warm', label: '被护的人，终会被护住', note: '你信光，愿意替人传愿。钟声落定，暖意回响——却隐隐有第四声追随。' },
        { id: 'mystery', label: '替人护着的人，才最孤独', note: '你看见落锁之下的孤独。钟声落定，回响沉向关帝庙的方向。' },
      ],
    },
    { type: 'settle', relic: '心愿絮条 · 第一声钟音' },
  ],
}

export const stationScripts: Record<string, StationScript> = { '1': PINGAN_SCRIPT }
```

- [ ] **Step 2: 验证类型/语法**

Run: `npx vue-tsc --noEmit -p shao` （若 shao 无 tsconfig 则跳过，改为 Task 3 构建验证）
Expected: 无该文件相关类型错误（若命令不可用，说明由构建兜底，见 Task 3）。

- [ ] **Step 3: Commit**

```
git add shao/data/tour-scenes.ts
git commit -m "feat(tour): 平安钟楼沉浸剧本数据（对白/输入/连点/分支/收束）"
```

### Task 2: `tour.vue` 叠加剧情播放层

**Files:**

- Modify: `shao/pages/activity/tour.vue`

**说明：** 在现有页面上叠加一个剧情播放层（`overlay`）。有剧本配置的站（当前 `'1'`），"打卡"按钮改为"进入剧情"；未走完剧情则播放，走完置 `done` 并调用原 `checkin`（后端幂等发分）。无剧本的站保持原逻辑。

- [ ] **Step 1: 导入剧本数据 + 新增剧情状态与** **`localStorage`** **读写**

在 `<script setup>` 顶部（`import ... from('../../services/api')` 后面）追加：

```ts
import { stationScripts, type TourNode } from '../../data/tour-scenes'
import { getToken } from '../../utils/storage'
```

在数据区（`const claiming = ref(false)` 附近）追加剧情状态：

```ts
const stageOpen = ref(false)
const curOrder = ref<string>('')
const curNodes = ref<TourNode[]>([])
const curIdx = ref(0)
const storyFeed = ref<{ speaker?: string; text: string; tone?: string }>({ text: '' })
const wishSel = ref('')
const tapCount = ref(0)
const doneRelic = ref('')

function storyKey() {
  const uid = (getToken() || '').slice(-6) || 'anon'
  return `tour_story_${documentId.value}_${uid}`
}
function loadStoryAll(): Record<string, any> {
  try { return JSON.parse(uni.getStorageSync(storyKey()) || '{}') } catch { return {} }
}
function saveStoryAll(m: Record<string, any>) {
  uni.setStorageSync(storyKey(), JSON.stringify(m))
}
function hasStoryDone(order: number): boolean {
  return !!loadStoryAll()[String(order)]?.done
}
```

- [ ] **Step 2: 改打卡入口** **`checkin()`** **→ 有剧本走剧情**

把原 `checkin` 函数替换为：

```ts
function stationScript(order: number): TourNode[] {
  return stationScripts[String(order)]?.nodes || []
}

function checkin(order: number) {
  const nodes = stationScript(order)
  if (nodes.length && !hasStoryDone(order)) {
    openStage(String(order), nodes)
    return
  }
  doCheckin(order)
}

async function doCheckin(order: number) {
  try {
    const res = await tourCheckinStation(documentId.value, order)
    progress.value = res?.progress ?? progress.value
    uni.showToast({ title: res?.already ? '该站点已打卡' : `打卡成功 +${story.value?.stationPoints}积分`, icon: 'none' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '打卡失败', icon: 'none' })
  }
}
```

- [ ] **Step 3: 剧情播放控制函数**

新增剧情流程函数（放在 `checkin` 之后）：

```ts
function openStage(order: string, nodes: TourNode[]) {
  curOrder.value = order
  curNodes.value = nodes
  curIdx.value = loadStoryAll()[order]?.node ?? 0
  tapCount.value = 0
  wishSel.value = ''
  doneRelic.value = ''
  stageOpen.value = true
  applyNode()
}
function applyNode() {
  const n = curNodes.value[curIdx.value]
  if (n?.type === 'narrative') storyFeed.value = { speaker: n.speaker, text: n.text, tone: 'narrative' }
}
function advance() {
  curIdx.value += 1
  // 记进度（续玩）
  const all = loadStoryAll(); all[curOrder.value] = { ...(all[curOrder.value] || {}), node: curIdx.value }
  saveStoryAll(all)
  if (curIdx.value >= curNodes.value.length) { finishStory(); return }
  applyNode()
}
function submitWish() {
  if (!wishSel.value.trim()) return uni.showToast({ title: '写点什么吧', icon: 'none' })
  const all = loadStoryAll(); all[curOrder.value] = { ...(all[curOrder.value] || {}), wish: wishSel.value, node: curIdx.value }
  saveStoryAll(all)
  advance()
}
function tapRing() {
  uni.vibrateShort?.()
  const rings = (curNodes.value[curIdx.value] as any)?.rings || []
  tapCount.value += 1
  storyFeed.value = { text: rings[tapCount.value - 1], tone: 'ring' }
  if (tapCount.value >= ((curNodes.value[curIdx.value] as any)?.target ?? 999)) {
    setTimeout(() => advance(), 600)
  }
}
function pickChoice(id: string, label: string) {
  const n = curNodes.value[curIdx.value] as any
  const opt = n.options.find((o: any) => o.id === id)
  storyFeed.value = { text: opt?.note || label, tone: 'choice' }
  const all = loadStoryAll(); all[curOrder.value] = { ...(all[curOrder.value] || {}), choice: id, node: curIdx.value }
  saveStoryAll(all)
  setTimeout(() => advance(), 800)
}
function finishStory() {
  const n = curNodes.value[curIdx.value - 1] as any
  doneRelic.value = n?.relic || ''
  const all = loadStoryAll(); all[curOrder.value] = { ...(all[curOrder.value] || {}), done: true, relic: doneRelic.value }
  saveStoryAll(all)
  setTimeout(() => { stageOpen.value = false; doCheckin(Number(curOrder.value)) }, 900)
}
```

- [ ] **Step 4: 新增剧情播放层模板**

在 `<template>` 根元素 `</view>`（`tour-page` 闭合前，原结构之后）插入剧情 overlay（放在模板结尾追加，独立于原布局）：

```html
      <!-- 沉浸剧情层 -->
      <view class="story-overlay" v-if="stageOpen">
        <view class="story-card">
          <text class="story-title" v-if="curNodes[curIdx]?.type !== 'tap'">{{ (stationScript(Number(curOrder)) as any)?.length ? '平安钟楼 · 三声钟一人愿' : '' }}</text>

          <view v-if="curNodes[curIdx]?.type === 'narrative'" class="story-feed">
            <text v-if="storyFeed.speaker" class="story-speaker">{{ storyFeed.speaker }}</text>
            <text class="story-text">{{ storyFeed.text }}</text>
            <view class="story-next" @click="advance"><text>继续 ›</text></view>
          </view>

          <view v-else-if="curNodes[curIdx]?.type === 'input'" class="story-feed">
            <text class="story-text">{{ storyFeed.text || '这一愿，你是替谁许的？' }}</text>
            <input class="story-input" v-model="wishSel" :placeholder="'写下你在乎的人，或想护的人'" />
            <view class="story-next" @click="submitWish"><text>落下絮条 ›</text></view>
          </view>

          <view v-else-if="curNodes[curIdx]?.type === 'tap'" class="story-ring">
            <text class="ring-hint">敲钟三下 · 已敲 {{ tapCount }}/{{ curNodes[curIdx].target }}</text>
            <view class="ring-bell" @click="tapRing"><text>🔔 敲钟</text></view>
            <text class="ring-feed">{{ storyFeed.text }}</text>
          </view>

          <view v-else-if="curNodes[curIdx]?.type === 'choice'" class="story-feed">
            <text class="story-text">{{ storyFeed.text || '你最信什么？' }}</text>
            <view class="story-choice" v-for="o in curNodes[curIdx].options" :key="o.id" @click="pickChoice(o.id, o.label)">
              <text>{{ o.label }}</text>
            </view>
          </view>

          <view v-else-if="curNodes[curIdx]?.type === 'settle'" class="story-feed">
            <text class="story-relic">{{ doneRelic || '线索已入行囊' }}</text>
            <text class="story-text">回声指向关帝庙——那里有位"话多的大爷"。</text>
            <view class="story-next"><text>完成本站 ›</text></view>
          </view>
        </view>
      </view>
```

- [ ] **Step 5: 追加剧情层样式**

在 `<style scoped>` 末尾追加：

```css
.story-overlay { position: fixed; inset: 0; z-index: 99; background: rgba(20,16,12,.92); display: flex; align-items: center; justify-content: center; padding: 48rpx; }
.story-card { width: 100%; max-width: 640rpx; background: #2f2a24; color: #f3ead8; border-radius: 20rpx; padding: 40rpx 32rpx; min-height: 320rpx; }
.story-title { display: block; font-size: 28rpx; color: #d9a44c; margin-bottom: 24rpx; }
.story-feed { display: flex; flex-direction: column; gap: 20rpx; }
.story-speaker { color: #d9a44c; font-weight: 600; }
.story-text { font-size: 32rpx; line-height: 1.7; color: #f3ead8; }
.story-next { align-self: flex-end; background: #d9a44c; color: #2f2a24; border-radius: 999rpx; padding: 14rpx 34rpx; font-weight: 600; }
.story-input { background: #3c362d; color: #f3ead8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 30rpx; }
.story-choice { background: #3c362d; border: 2rpx solid #6b4f2a; border-radius: 14rpx; padding: 24rpx; text-align: center; }
.story-ring { display: flex; flex-direction: column; align-items: center; gap: 28rpx; padding: 20rpx 0; }
.ring-hint { color: #c9ba9a; font-size: 28rpx; }
.ring-bell { width: 220rpx; height: 220rpx; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #d9a44c, #6b4f2a); display: flex; align-items: center; justify-content: center; font-size: 44rpx; box-shadow: 0 10rpx 30rpx rgba(217,164,76,.35); }
.ring-feed { text-align: center; font-size: 28rpx; color: #f3ead8; min-height: 40rpx; }
.story-relic { text-align: center; color: #d9a44c; font-weight: 700; font-size: 32rpx; }
```

- [ ] **Step 6: 构建验证**

Run（在仓库根）: `cd shao && npm run dev:h5`（或 `npm run build:h5`）
Expected: 编译通过、无类型/模板语法错误；`tour.vue` 与 `tour-scenes.ts` 无报错。

- [ ] **Step 7: Commit**

```
git add shao/data/tour-scenes.ts shao/pages/activity/tour.vue
git commit -m "feat(tour): 平安钟楼沉浸剧情播放层（对白/心愿/连点/分支/收束）"
```

### Task 3: 部署到 v.joho.cn

**Files:**

- Run: `deploy-h5.ps1`（此前用于部署 v.joho.cn 的前端构建+发布脚本）

- [ ] **Step 1: 触发部署**

Run: `powershell -File e:\code\scripts\deploy-h5.ps1`（若 shao 结构需先构建，按脚本既有流程执行）
Expected: 构建成功、发布到 v.joho.cn 完成。

> 若部署脚本路径/参数与 course 部署不同，以实际 `scripts/` 下 v.joho 部署脚本为准；后端零改动，不需要 rebuild dist / pm2 重启。

- [ ] **Step 2: 线上冒烟**

用 agent-browser 或手机打开 `https://v.joho.cn/#/pages/activity/tour?id=4f9575ee7904198ea53678836ad4c05e`，确认页面正常加载旧剧本页结构（剧情层由真实玩家进入平安钟楼触发）。

### Task 4: 验收闭环（手工，需登录态 id2）

**说明：** 本仓库 `shao` 无前端单测基建，采用"构建通过 + 生产闭路"验收。后端积分幂等已由现有 `tourCheckinStation` 保证，本次不涉及后端改动。

- [ ] **Step 1: 闭路验收**

以 id2 账号在平安钟楼站点击"打卡"→ 应进入 **沉浸剧情**（非直接打卡）：

1. S1–S5 对白逐幕可推进；
2. S3 心愿匣可输入并提交；
3. S4 连点 3 下，每下震动 + 回响字幕，第 3 下后自动推进；
4. S6 两个分支选项点选后显示对应 epilogue；
5. S7 收束掉落「心愿絮条」并自动完成本站。

- [ ] **Step 2: 结果核对**

确认：`tourProgress.stations` 含该站 order、`tour_checkin` 积分仅发一次（重复进入不再重发）、后续再点该站"打卡"直接完成（不再进剧情）。

***

## Self-Review（编写时自查）

- **Spec 覆盖**：叙事 S1–S7 → Task 1 + Task 2 Step3/4；连点规格 → `tap` 节点 + `tapRing`；进度持久化 → `tour_story_*` localStorage；结算复用 → `doCheckin` 调 `tourCheckinStation`；边界 → 断网/续玩（`node` 续接）、幂等（后端已有）、防误触（overlay 独立层）。✓

- **后端零改动**：不触碰 `zhao-point/src`，无需 dist 重建/重启，符合最低风险。✓

- **类型一致性**：`TourNode`/`StationScript` 在 Task1 定义、Task2 引用；`stationScripts['1']`；函数名 `checkin`/`doCheckin`/`openStage`/`advance`/`finishStory` 跨步骤一致。✓

- **约定**：storyKey 用 token 尾 6 + documentId 避免跨活动/跨账号串档；与现有 `page` 插件同理。✓

