# 分享领分冷却锁定 + 按钮点亮/置灰 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现活动分享领分「距上次成功≥30分钟才可点亮领取按钮，成功即置灰，次日不自动解锁」的完整后端状态接口与前端按钮态控制。

**Architecture:** 后端将 `activity_share` 冷却判定从「跨日解锁+好友点击」收敛为「仅距上次成功≥interval」，并新增只读状态接口 `/my/point/share/status` 供前端查询点亮/置灰原因；前端新增共享 `useShareClaim` 组合式函数，统一接入任务中心、活动页、分享引导弹窗三个入口，实现倒计时自动点亮、失败/置灰原因提示。

**Tech Stack:** Strapi5 插件（zhao-point）、Koa 控制器、TypeScript、uni-app（Vue3 `<script setup>`、Composition API）。

**基础事实（务必遵守）：**
- 本项目不写单元测试、不做 TDD（Strapi 插件 + uni-app 前端均无测试骨架），每步以「代码 + 自检点」替代「红绿测试」。
- 前后端分开提交：后端改动在 `e:\code\basic` 提交；前端改动在 `e:\code\shao` 提交。
- `request()` 在未登录且路由非公开时抛 `Error('未登录')` 并触发跳登录 —— 状态轮询前必须先用 `isLoggedIn()` 短路，禁止未登录时调用受保护状态接口。
- GET 状态接口返回：HTTP body `{ data: <status对象>, meta }`；前端 `request()` 返回该 body，`api.ts` 需 `return res?.data` 取出 status 对象。

---

## 文件清单

**后端（e:\code\basic\plugins\zhao-point\server\src）：**
- Modify `services/point.ts` — 收敛冷却判定、删除好友点击逻辑、新增 `getShareStatus`。
- Modify `controllers/point.ts` — 新增 `shareStatus` 控制器方法。
- Modify `routes/content-api.ts` — 注册 `GET /my/point/share/status`。

**前端（e:\code\shao）：**
- Create `utils/use-share-claim.ts` — 共享组合式函数 + 状态/文案工具。
- Modify `services/api.ts` — 新增 `getShareClaimStatus`。
- Modify `components/share-guide/share-guide.vue` — 按钮点亮/置灰/原因。
- Modify `pages/tasks/tasks.vue` — 分享任务按钮态。
- Modify `pages/activity/detail.vue` — 显式领分按钮 + 海报关闭领分收敛。

**参考规范：** `docs/superpowers/specs/2026-08-31-share-claim-cooldown-lock-design.md`

---

## Task 1: 后端服务 — 收敛冷却判定并新增 getShareStatus

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\point.ts`

### Step 1.1: 顶部新增 ACTIVITY_UID 常量

在文件顶部 `const RECORD_UID = "plugin::zhao-point.point-record";` 之后（第 4 行后）新增一行：

```typescript
const ACTIVITY_UID = "plugin::zhao-point.activity";
```

**自检点：** 文件顶部有两个常量（RECORD_UID + ACTIVITY_UID），编译无未定义引用。

### Step 1.2: 删除好友点击辅助函数 hasShareVisitSince

删除 `hasShareVisitSince` 整个函数（当前约 L107–117），以及导出对象中的 `hasShareVisitSince,`（约 L974）。

> 原因：新规则去掉「好友点击」门槛，该函数成为无引用死代码。删除前务必用 Grep 确认 `hasShareVisitSince` 在 point.ts 内仅有「定义处、旧冷却调用处、导出处」三处引用（本计划会同步清理调用处），项目其余位置无引用。

**自检点：** `Grep "hasShareVisitSince"` 在 `server/src` 下返回 0 匹配。

### Step 1.3: 收敛 activity_share 冷却判定

将 `earnPoints` 内 `if (action === "activity_share") { ... }` 分支（现约 L249–274，含 `startOfToday` 跨日判断与 `hasShareVisitSince` 调用）整体替换为以下代码（保持外层 `if (interval > 0)` 与 `else { cooldownRemainingMs... }` 结构不变）：

```typescript
        if (action === "activity_share") {
          // 分享领分冷却：距上次成功>=interval 才可领取；跨自然日不自动解锁（无误时置灰、成功即重置计时）
          const last = await strapi.db.query(RECORD_UID).findOne({
            where: { user: userId, action, type: "increase" },
            orderBy: { createdAt: "desc" },
            select: ["createdAt"],
          });
          if (last?.createdAt) {
            const elapsed = Date.now() - new Date(last.createdAt).getTime();
            if (elapsed < interval * 60 * 1000) {
              const min = Math.ceil((interval * 60 * 1000 - elapsed) / 60000);
              throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
            }
          }
        } else {
          const remainMs = await cooldownRemainingMs(userId, action, interval);
          if (remainMs > 0) {
            const min = Math.ceil(remainMs / 60000);
            throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
          }
        }
```

**自检点：** `startOfToday`、`hasShareVisitSince`、`hasVisit` 在本文件不再出现；冷却只依赖 `last.createdAt` 与 `interval`。

### Step 1.4: 新增 getShareStatus 服务方法

在 `getTasks` 定义之后、`return { ... }` 对象之前，新增方法（`countTodayAction`、`getMergedRule`、`RECORD_UID`、`ACTIVITY_UID` 均在闭包内可访问）：

```typescript
  // 分享领分状态查询：供任务中心 / 活动页点亮「领取积分」按钮、展示规则与置灰原因
  const getShareStatus = async (params: { userId: number | string; activityId?: string | number | null }) => {
    const { userId, activityId } = params;
    const rule = await getMergedRule("activity_share");
    const interval = Number(rule?.extraConfig?.intervalMinutes) || 30;
    const limitPerDay = Number(rule?.limitPerDay) || 0;
    // 积分值：活动类按 shareRewardPoints 定价，未配/查不到回退规则默认分，再无则 5
    let points = Number(rule?.points) || 5;
    if (activityId != null) {
      try {
        const idNum = Number(activityId);
        const act = await strapi.db.query(ACTIVITY_UID).findOne({
          where: Number.isNaN(idNum) ? { documentId: String(activityId) } : { id: idNum },
          select: ["shareRewardPoints"],
        });
        if (act?.shareRewardPoints) points = Number(act.shareRewardPoints);
      } catch {
        // 活动不存在或类型异常：回退默认分
      }
    }

    const last = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId, action: "activity_share", type: "increase" },
      orderBy: { createdAt: "desc" },
      select: ["createdAt"],
    });
    const dailyCount = await countTodayAction(userId, "activity_share");

    let remainingMs = 0;
    if (last?.createdAt) {
      const elapsed = Date.now() - new Date(last.createdAt).getTime();
      remainingMs = Math.max(0, interval * 60 * 1000 - elapsed);
    }
    let canClaim = remainingMs === 0;
    if (limitPerDay > 0 && dailyCount >= limitPerDay) canClaim = false;

    return {
      action: "activity_share",
      canClaim,
      points,
      remainingMs,
      dailyCount,
      dailyLimit: limitPerDay,
      intervalMinutes: interval,
    };
  };
```

### Step 1.5: 导出 getShareStatus

在 `return { ... }` 对象的 `getTasks,` 之后新增：

```typescript
    getShareStatus,
```

**自检点：** `getShareStatus` 在 return 对象内且方法已定义；文件无 TypeScript 编译错误（`countTodayAction`/`getMergedRule` 均已声明）。

---

##### Task 2: 后端控制器 — earnShare 补渠道 + shareStatus 接口

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\point.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

### Step 2.0: earnShare 补「客户渠道兜底」解析

原因：`createRecord` 在无渠道时抛 `POINT_020`。当前 `earnShare` 把前端未传的 `body.channelId`（恒 undefined）当 userChannelId，导致**分享领分永远写不进记录、必然失败**。需改为三级解析用户归属渠道。

将 `earnShare` 中 `const record = await ...earnPoints({...})` 之前，插入渠道解析并把结果用作 `userChannelId`：

```typescript
      // 解析用户归属渠道（客户渠道兜底）：
      // 1) 用户当前渠道(channel-member isCurrent) 2) 直接授权渠道第一个 3) 当前站点关联渠道第一个
      let resolvedChannel: number | undefined = undefined;
      const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
      if (channelSvc) {
        const member = await strapi.db.query("plugin::zhao-channel.channel-member")
          .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
        resolvedChannel = member?.channel?.id || member?.channel;
        if (!resolvedChannel) {
          const dirs = await channelSvc.getUserDirectChannels(userId);
          resolvedChannel = dirs?.[0];
        }
      }
      if (!resolvedChannel) {
        // 兜底：当前站点关联的第一个渠道（复用 ensureDefaultChannel 同一套 getAvailableChannels）
        const siteDocId = (ctx as any).state?.siteDocumentId;
        if (siteDocId) {
          const siteSvc = strapi.plugin("zhao-common")?.service("site-config");
          const siteChannels = siteSvc?.getAvailableChannels
            ? await siteSvc.getAvailableChannels(siteDocId)
            : null;
          resolvedChannel = Array.isArray(siteChannels) && siteChannels.length > 0
            ? (siteChannels[0].id ?? undefined)
            : undefined;
        }
      }
      const record = await strapi.plugin("zhao-point").service("point").earnPoints({
        userId, action, source: "activity", method: "用户分享领取",
        remark, points, userChannelId: resolvedChannel,
      });
```

> 说明：`userChannelId` 用解析结果 `resolvedChannel`（不再用 `body.channelId`）；站点仍无关联渠道时保持 undefined，由 `createRecord` 抛 `POINT_020` 作最终裁决（极小概率，运营补站点渠道即可）。

**自检点：** `earnShare` 内不再引用 `body.channelId`；三级解析顺序正确；未登录/无站点时不会抛异常（getAvailableChannels 调用做存在性判断）。

### Step 2.1: 控制器新增 shareStatus

在 `controllers/point.ts` 的 `reportShareVisit`（约 L454）之前，插入新方法到 return 对象：

```typescript
  async shareStatus(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { activityId } = ctx.query || {};
      const result = await strapi.plugin("zhao-point").service("point").getShareStatus({ userId, activityId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 500;
      ctx.body = { error: e.message };
    }
  },
```

**自检点：** `getUserId`/`wrap` 为本文件闭包内已有工具；新方法插入在 return 对象内、与其他方法与逗号分隔正确。

### Step 2.2: 注册路由

在 `routes/content-api.ts` 中 `userRoute("POST", "/my/point/earn/share", "point.earnShare"),`（第 74 行）之后新增：

```typescript
    userRoute("GET", "/my/point/share/status", "point.shareStatus"),
```

**自检点：** 路由为受登录保护的 `userRoute`，路径为 `/zhao-point/v1/my/point/share/status`，handler 指向 `point.shareStatus`。

---

## Task 3: 前端 API + 共享组合式函数

**Files:**
- Create: `e:\code\shao\utils\use-share-claim.ts`
- Modify: `e:\code\shao\services\api.ts`

### Step 3.1: api.ts 新增 getShareClaimStatus

在 `claimActivityShare`（约 L678–690）之后新增：

```typescript
// 查询分享领分状态（canClaim/points/remainingMs/每日次数），用于任务中心/活动页按钮点亮与置灰
export async function getShareClaimStatus(activityId?: string) {
  const q = activityId ? `?` + new URLSearchParams({ activityId }).toString() : ''
  const res: any = await request(`/zhao-point/v1/my/point/share/status${q}`, { method: 'GET' })
  return res?.data ?? res
}
```

**自检点：** 与 `claimActivityShare` 一致地 `return res?.data`，返回后端 wrap 的 status 内层对象。

### Step 3.2: 创建 use-share-claim.ts

新建文件 `e:\code\shao\utils\use-share-claim.ts`：

```typescript
import { ref, onUnmounted } from 'vue'
import { getShareClaimStatus, claimActivityShare } from '../services/api'
import { isLoggedIn } from './storage'
import { redirectToLogin } from './auth'

export interface ShareClaimState {
  canClaim: boolean
  points: number
  remainingMs: number
  dailyCount: number
  dailyLimit: number
  intervalMinutes: number
}

export const DEFAULT_SHARE_STATE: ShareClaimState = {
  canClaim: false,
  points: 5,
  remainingMs: 0,
  dailyCount: 0,
  dailyLimit: 0,
  intervalMinutes: 30,
}

/**
 * 分享领分状态管理：任务中心 / 活动页 / 分享引导弹窗共用。
 * activityId?: 返回当前活动 id 的回调（活动页传函数包装的页面 id；其他入口不传）。
 */
export function useShareClaim(activityId?: () => string | undefined) {
  const state = ref<ShareClaimState>({ ...DEFAULT_SHARE_STATE })
  const loading = ref(false)
  const claiming = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function clearTimer() {
    if (timer) { clearInterval(timer); timer = null }
  }

  async function refresh() {
    clearTimer()
    // 未登录不轮询受保护接口，按钮置灰（避免误触发跳登录）
    if (!isLoggedIn()) {
      state.value = { ...DEFAULT_SHARE_STATE, canClaim: false }
      return
    }
    loading.value = true
    try {
      const aid = activityId?.()
      const d: any = await getShareClaimStatus(aid)
      state.value = {
        canClaim: !!d?.canClaim,
        points: typeof d?.points === 'number' ? d.points : DEFAULT_SHARE_STATE.points,
        remainingMs: Number(d?.remainingMs) || 0,
        dailyCount: Number(d?.dailyCount) || 0,
        dailyLimit: Number(d?.dailyLimit) || 0,
        intervalMinutes: Number(d?.intervalMinutes) || DEFAULT_SHARE_STATE.intervalMinutes,
      }
      // 冷却中 → 每秒倒计时，到 0 自动重新查询点亮
      if (!state.value.canClaim && state.value.remainingMs > 0) {
        timer = setInterval(() => {
          state.value.remainingMs = Math.max(0, state.value.remainingMs - 1000)
          if (state.value.remainingMs <= 0) { clearTimer(); refresh() }
        }, 1000)
      }
    } catch {
      // 查询失败回退可点按（后端做最终裁决），避免功能不可用；已登录则给默认值
      state.value = { ...DEFAULT_SHARE_STATE, canClaim: isLoggedIn() }
    } finally {
      loading.value = false
    }
  }

  async function claim() {
    if (claiming.value) return { ok: false, message: '请稍候' }
    if (!isLoggedIn()) { redirectToLogin(); return { ok: false, message: '请先登录' } }
    claiming.value = true
    try {
      const aid = activityId?.()
      const rec: any = await claimActivityShare(aid ? { activityId: aid } : {})
      const pts = typeof rec?.points === 'number' ? rec.points : state.value.points
      await refresh()
      return { ok: true, points: pts }
    } catch (e: any) {
      const msg = (e as any)?.error || (e as any)?.message || '领取失败'
      return { ok: false, message: msg }
    } finally {
      claiming.value = false
    }
  }

  onUnmounted(clearTimer)

  return { state, loading, claiming, refresh, claim }
}

/** 规则说明文案 */
export function shareRuleText(s: ShareClaimState) {
  const interval = s.intervalMinutes || 30
  const daily = s.dailyLimit || 0
  return `每次分享得 ${s.points} 积分${daily > 0 ? `，每日最多 ${daily} 次` : ''}，两次间隔 ${interval} 分钟`
}

/** 置灰原因文案（canClaim 或无需冷却时返回空串） */
export function shareReasonText(s: ShareClaimState) {
  if (s.canClaim) return ''
  if (s.dailyLimit > 0 && s.dailyCount >= s.dailyLimit) return '今日分享积分次数已达上限'
  const min = Math.ceil(s.remainingMs / 60000)
  if (min > 0) return `距下次可领取约 ${min} 分钟`
  return '登录后可领取'
}
```

**自检点：** 未登录时 `refresh` 不调用接口；`shareReasonText` 三种原因（次数满/倒计时/未登录）覆盖；`claim` 成功后调用 `refresh` 使按钮立即置灰。

---

## Task 4: 分享引导弹窗接入状态

**Files:**
- Modify: `e:\code\shao\components\share-guide\share-guide.vue`

### Step 4.1: 模板字定义 + 按钮态

将模板中两处替换：

title 与 desc（L4–5）改为动态：
```vue
<text class="sg-title">分享活动得积分</text>
<text class="sg-desc">{{ ruleText }}</text>
```

「我已分享」按钮（L20–23）改为：
```vue
<view class="sg-actions">
  <view class="sg-btn cancel" @click="close">取消</view>
  <view class="sg-btn submit" :class="{ disabled: !canClaim }" @click="doClaim">
    <text>{{ canClaim ? '我已分享 · 领取积分' : '未到领取时间' }}</text>
  </view>
</view>
<view v-if="!canClaim && reasonText" class="sg-reason"><text>{{ reasonText }}</text></view>
```

### Step 4.2: script 接入 useShareClaim

将 `<script setup>` 中 `import { ref } from 'vue'` 改为 `import { ref, watch, computed } from 'vue'`；在 `import { claimActivityShare } from '../../services/api'` 处替换 import：

用 useShareClaim 替代对 claimActivityShare 的直接调用：
```typescript
import { useShareClaim, shareRuleText, shareReasonText } from '../../utils/use-share-claim'

const { state: claim, refresh: refreshShare, claim: claimShare } = useShareClaim()
const claiming = ref(false)

const canClaim = computed(() => claim.value.canClaim)
const ruleText = computed(() => shareRuleText(claim.value))
const reasonText = computed(() => shareReasonText(claim.value))

watch(() => props.visible, (v) => { if (v) refreshShare() })

async function doClaim() {
  if (!canClaim.value) {
    if (reasonText.value) uni.showToast({ title: reasonText.value, icon: 'none', duration: 2000 })
    return
  }
  if (claiming.value) return
  claiming.value = true
  try {
    const r = await claimShare()
    if (r.ok) {
      emit('claimed'); close()
      uni.showToast({ title: `+${r.points} 积分已到账`, icon: 'none' })
      const targetType = props.linkType
      const targetId = props.linkTargetId
      if (targetType && targetType !== 'none' && targetId) emit('goto', { linkType: targetType, linkTargetId: targetId })
    } else {
      uni.showToast({ title: r.message, icon: 'none', duration: 2000 })
    }
  } finally {
    claiming.value = false
  }
}
```

将原 `copyLink` 中成功回调里的 `claim()` 改为 `doClaim()`（保证未点亮时不误领）。

**自检点：** `claimActivityShare` 直接 import 已从本文件移除；`claim` 改名 `doClaim` 复位；visible 打开即刷新状态。

---

## Task 5: 任务中心分享任务按钮态

**Files:**
- Modify: `e:\code\shao\pages\tasks\tasks.vue`

### Step 5.1: 模板分享任务按钮置灰态

将第 27 行「去分享」按钮改为：
```vue
<view class="status-todo" v-else-if="task.action === 'activity_share' && !task.isCompleted"
  :class="{ disabled: !shareCanClaim }" @click="openShareGuide(task)">去分享</view>
```

### Step 5.2: script 接入 useShareClaim

在 `<script setup>` 内 `import { ... } from 'vue'` 增加 `computed`（若未引入）；新增：
```typescript
import { useShareClaim } from '../../utils/use-share-claim'
const { state: shareClaim, refresh: refreshShare } = useShareClaim()
const shareCanClaim = computed(() => shareClaim.value.canClaim)
```

在 `onShow`（L95–97）中追加 `refreshShare()`：
```typescript
onShow(() => {
  loadTasks()
  refreshShare()
})
```

将 `openShareGuide`（L99–102）改为带原因提示的守卫：
```typescript
function openShareGuide(task: any) {
  if (!shareCanClaim.value) {
    const s = shareClaim.value
    if (s.dailyLimit > 0 && s.dailyCount >= s.dailyLimit) {
      uni.showToast({ title: '今日分享积分次数已达上限', icon: 'none' })
    } else {
      const min = Math.ceil(s.remainingMs / 60000)
      if (min > 0) uni.showToast({ title: `距下次可领取约 ${min} 分钟`, icon: 'none' })
      else uni.showToast({ title: '登录后可领取', icon: 'none' })
    }
    return
  }
  currentShareTask.value = task
  showShareGuide.value = true
}
```

在 scoped style 内追加置灰样式：
```scss
.status-todo.disabled { opacity: 0.5; }
```

**自检点：** 任务中心分享任务在冷却中点击「去分享」只 toast 原因、不弹窗；领取成功后 `shareCanClaim` 转 false 使按钮置灰。

---

## Task 6: 活动页显式领分按钮 + 海报关闭领分收敛

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

### Step 6.1: import

在 script 中 `import { claimActivityShare } from '../../services/api'`（约 L560）改为全部收敛到 useShareClaim —— 保留 import 行但本步后 `claimActivityShare` 不再被 detail.vue 直接引用，可将该 import 移除。新增：
```typescript
import { useShareClaim, shareReasonText } from '../../utils/use-share-claim'
```

### Step 6.2: 模板新增显式领分按钮

在分享区 `share-tip`（L159–161）之后新增：
```vue
<view class="share-claim-row">
  <view class="share-claim-btn" :class="{ disabled: !shareCanClaim }" @click="claimSharePoints">
    <text>{{ shareCanClaim ? `领${sharePoints}积分` : '未到领取时间' }}</text>
  </view>
</view>
<view v-if="!shareCanClaim && shareReason" class="share-claim-reason"><text>{{ shareReason }}</text></view>
```

### Step 6.3: script 接入状态与领分动作

在 script 中（`const showSharePoster = ref(false)` 附近）新增：
```typescript
const { state: shareClaim, refresh: refreshShare, claim: claimShare } = useShareClaim(() => id)
const shareCanClaim = computed(() => shareClaim.value.canClaim)
const sharePoints = computed(() => shareClaim.value.points)
const shareReason = computed(() => shareReasonText(shareClaim.value))
```

在 `onShow`（L1933–1938）内追加 `refreshShare()`：
```typescript
onShow(() => {
  if (id && activity.value) {
    restoreSignupState()
    setupActivityShare()
    refreshShare()
  }
})
```

将「海报关闭静默领分」函数 `onSharePosterClosed`（L612–621）收敛为统一领分（可领则领、否则提示原因）：
```typescript
async function onSharePosterClosed() {
  showSharePoster.value = false
  await claimSharePoints()
}

async function claimSharePoints() {
  if (!shareCanClaim.value) {
    if (shareReason.value) uni.showToast({ title: shareReason.value, icon: 'none' })
    return
  }
  const r = await claimShare()
  if (r.ok) uni.showToast({ title: `分享成功 +${r.points}积分`, icon: 'none' })
  else if (r.message) uni.showToast({ title: r.message, icon: 'none' })
}
```

在分享区 scoped style 中 `share-tip` 相关样式后新增：
```scss
.share-claim-row { margin-top: 16rpx; }
.share-claim-btn { padding: 20rpx; border-radius: 44rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; text-align: center; font-size: 30rpx; font-weight: 500; }
.share-claim-btn.disabled { background: #c9c9c9; }
.share-claim-reason { margin-top: 10rpx; text-align: center; font-size: 24rpx; color: #999; }
```

**自检点：** 活动页「领N积分/未到领取时间」按钮随 `canClaim` 切换；冷却中点击只提示原因；海报关闭不再静默（可领则领并 toast，不可领提示原因）；领取成功后按钮立即置灰。

---

## Task 7: 构建自检与提交

**Files:**
- Transcript（无新增文件）

### Step 7.1: 后端类型检查

在 `e:\code\basic\plugins\zhao-point\server` 下（若 package.json 有 tsc 脚本）运行类型检查；若无脚本，依赖运行时编译验证。确认 `point.service`、`point.controller` 无语法/引用错误。

**自检点：** `getShareStatus` 被 controller 调用且已导出；无对 `hasShareVisitSince` 的残留引用。

### Step 7.2: 提交后端

```bash
git add plugins/zhao-point/server/src/services/point.ts plugins/zhao-point/server/src/controllers/point.ts plugins/zhao-point/server/src/routes/content-api.ts
git commit -m "feat(zhao-point): 分享领分改为仅距上次成功>=30分钟，新增 share/status 状态接口"
```

### Step 7.3: 前端构建

在 `e:\code\shao` 下运行（用 npm，勿用 pnpm，避免 corepack 报错）：`npm run build:h5`，确认无编译错误。

### Step 7.4: 提交前端

```bash
git add utils/use-share-claim.ts services/api.ts components/share-guide/share-guide.vue pages/tasks/tasks.vue pages/activity/detail.vue
git commit -m "feat(shao): 分享领分按钮状态点亮/置灰+规则提示，接入三入口"
```

---

## 校验口径（部署前人工核对）

| 场景 | 期望 |
| --- | --- |
| 首次（无记录） | `canClaim=true`，按钮点亮，可直接领 |
| 领取成功 | 按钮立即置灰，进入 30 分钟倒计时 |
| 30 分钟内点领 | 后端返回「请 X 分钟后重试」；前端置灰+toast 原因 |
| 满 30 分钟 | 按钮点亮（跨日不影响） |
| 当日已领满 4 次 | 置灰并提示「今日分享积分次数已达上限」 |
| 次日 | 次数归 0；但距上次成功不满 30 分钟仍置灰（不自动解锁） |
| 未登录 | 置灰，提示「登录后可领取」，且不误触发跳登录 |
| 网络失败 | 回退可点按，后端作最终裁决 |