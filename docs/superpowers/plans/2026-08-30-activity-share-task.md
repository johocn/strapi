# 活动分享转发任务 + 分享引导示意图 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在任务中心新增「分享活动」任务（每次分享得 5 积分、30 分钟冷却、每日上限 4 次、点击即领），并在活动海报页同步触发领分；同时提供微信好友/朋友圈分享操作示意图引导。

**Architecture:** 后端在 `point-rule` 增加 `activity_share` 规则并接入现有规则引擎；在 `earnPoints` 事务内增加"距上次成功分享 30 分钟"冷却校验（每次成功分享后重置）；新增 C 端用户侧领取路由 `POST /v1/my/point/earn/share`（白名单仅 `activity_share`）。C 端任务中心弹分享引导示意图并手动领分，活动海报页复用同一接口触发。

**Tech Stack:** Strapi 5（zhao-point 插件）、uni-app (Vue3 setup, H5)、zhao-point services。

**测试方式：** 本插件无 JUnit 风格单测，遵循项目既有验收脚本模式（`scripts/accept-*.cjs`，PG 直连 + Strapi 服务调用）。本计划在 Task 1-2 用临时 Node accept 脚本验证冷却/上限，完成后删除。

---

## 文件结构

**后端（e:\code\basic\plugins\zhao-point）**
- `server/src/config/index.ts`：increaseRules 加 `activity_share`（+字段 `extraConfig.intervalMinutes`）。
- `server/src/services/point.ts`：`earnPoints` 事务内加冷却校验 helper + 抛错 `POINT_020`；导出新增 helper `countRecentAction`。
- `server/src/controllers/point.ts`：新增 `earnShare` 控制器（白名单校验 + 调 earnPoints）。
- `server/src/routes/content-api.ts`：新增 userRoute `POST /my/point/earn/share`。
- `server/src/errors/config.ts`（或 point.ts 内定义处）：注册 `POINT_020`。

**C 端（e:\code\shao）**
- `services/api.ts`：新增 `claimActivityShare()`。
- `components/share-guide/share-guide.vue`：新建，微信好友/朋友圈操作示意图弹窗。
- `pages/tasks/tasks.vue`：social 分组展示分享活动卡 + 弹 share-guide + 领分。
- `pages/activity/detail.vue`：点分享海报关闭后触发 `claimActivityShare()`。

---

### Task 1: 注册 activity_share 积分规则

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\config\index.ts`

- [ ] **Step 1: 在 increaseRules 社交类新增规则**

在 `social` 分组（`join_community` 行之后）追加：

```ts
      activity_share:       { points: 5,    limitPerDay: 4,  isOneTime: false, description: "分享活动",         taskGroup: "social", extraConfig: { intervalMinutes: 30 } },
```

- [ ] **Step 2: 说明线上已有规则的处理**

`bootstrap.ts` 是对缺失 action 做一次性 seed（已存在则跳过）。若线上已部署过 `activity_share`（本功能未上线则不存在），需在服务器上手动 upsert 该规则的 `limitPerDay=4`、`extraConfig.intervalMinutes=30`。**本功能首次上线无需处理**；此处仅记录：若规则已存在但缺 intervalMinutes，通过运营端积分规则编辑 extraConfig 补齐。

- [ ] **Step 3: 验证编译**

Run: `cd e:\code\basic && npm run build -w @zhao/point` (或用项目对应构建命令)

Expected: 编译通过，无 TS 错误。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/config/index.ts
git commit -m "feat(zhao-point): 新增 activity_share 分享活动积分规则"
```

---

### Task 2: earnPoints 增加 30 分钟冷却校验

**Files:**
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\point.ts`

背景：`earnPoints`（line 178-243）是事务化防重入口，注册用户领分（`activity_share`）走这里。冷却逻辑放此函数内，与 `limitPerDay`/`isOneTime` 并列。

- [ ] **Step 1: 新增冷却 helper（文件内 helper 区）**

找到 `checkOneTimeClaimed` / `countTodayAction` 定义附近，新增：

```ts
  /** 冷却校验：返回距上次成功记录还剩多少毫秒（<=0 表示可通过） */
  const cooldownRemainingMs = async (userId: number, action: string, intervalMinutes: number): Promise<number> => {
    const RECORD_UID = "plugin::zhao-point.point-record";
    const last = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId, action, type: "increase" },
      orderBy: { createdAt: "desc" },
      select: ["createdAt"],
    });
    if (!last?.createdAt) return 0;
    const elapsed = Date.now() - new Date(last.createdAt).getTime();
    return Math.max(0, intervalMinutes * 60 * 1000 - elapsed);
  };
```

> 注意：为防并发下冷却误判，`earnPoints` 已在事务里对用户主行加 `forUpdate()` 排他锁，冷却检查与写入同事务，天然串行，无需额外锁。

- [ ] **Step 2: 在 earnPoints 事务内、limitPerDay 检查之后插入冷却检查**

在 line 214（`limitPerDay` 检查块之后）与 line 216（`getLatestBalance` 之前）之间插入：

```ts
      // 冷却校验：each successful share 后重置计时（以最后一次成功记录为准）
      const interval = Number((rule.extraConfig as any)?.intervalMinutes) || 0;
      if (interval > 0) {
        const remainMs = await cooldownRemainingMs(userId, action, interval);
        if (remainMs > 0) {
          const min = Math.ceil(remainMs / 60000);
          throwError("POINT_020", `请${Math.max(1, min)}分钟后重试`, { action, intervalMinutes: interval });
        }
      }
```

- [ ] **Step 3: 说明 POINT_020 轮询**

`throwError(code, message)` 是第三方自定义函数（`point.ts:169`），错误码以字符串直接传入，**无需预注册映射表**。仅需在 `earnShare` 控制器的 catch 状态列表加入 `POINT_020`（已在前一步列入 `["POINT_001","POINT_004","POINT_011","POINT_019","POINT_020"]`）即可映射到 HTTP 400。

- [ ] **Step 4: 新增 C 端领取控制器 point.earnShare**

Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\point.ts`

```ts
  // 用户侧领取积分（白名单 action；积分值取规则，不信任客户端）
  async earnShare(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { action } = body;
      // 白名单：仅允许分享类手动领取，防传任意 action 刷分
      if (action !== "activity_share") {
        ctx.status = 400;
        ctx.body = { error: "不允许领取该类型积分", code: "POINT_021" };
        return;
      }
      const record = await strapi.plugin("zhao-point").service("point").earnPoints({
        userId, action,
        source: "activity", method: "用户分享领取",
        remark: "分享活动", channelId: body.channelId, userChannelId: body.channelId,
      });
      ctx.body = wrap(record);
    } catch (e: any) {
      const status = ["POINT_001","POINT_004","POINT_011","POINT_019","POINT_020"].includes(e.code) ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },
```

> 注意：`getUserId` 在 `point.ts` 现有定义是 `ctx.state.user.id || ctx.state.user.documentId`（line 21），SSO 桥接为业务 up_user id 的前置逻辑如需，参照 `activity.ts` 的 `getUserId`（line 33）做桥接兼容。若 `point.ts` 现有 getUserId 不够稳，改用与 activity.ts 相同的桥接实现。

- [ ] **Step 5: 注册路由**

Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

在用户路由区（如 `sign-in` 附近）新增：

```ts
    userRoute("POST", "/my/point/earn/share", "point.earnShare"),
```

- [ ] **Step 6: 验收（临时 accept 脚本验证冷却/上限）**

新建 `e:\code\basic\plugins\zhao-point\scripts\accept-share-task.cjs`（复用现有 accept-*.cjs 的 PG/登录/积分核验写法），验证：
1. 复用管理员 grant 或直接调 earnShare，首次领取 → +5，记录入表。
2. 立即再调 → 400 `POINT_020`。
3. 手动把最近记录 `createdAt` 改为 30 分钟前（直连 PG）→ 再次领取成功 +5。
4. 当日第 5 次 → 400 `POINT_004`。
5. 清理测试记录与用户，零残留。

Run: `node scripts/accept-share-task.cjs`
Expected: 全断言通过。

- [ ] **Step 7: Commit**

```bash
git add plugins/zhao-point/server/src/services/point.ts plugins/zhao-point/server/src/controllers/point.ts plugins/zhao-point/server/src/routes/content-api.ts plugins/zhao-point/scripts/accept-share-task.cjs
git commit -m "feat(zhao-point): 分享活动领分接口+30分钟冷却防刷"
```

---

### Task 3: C 端 API 方法

**Files:**
- Modify: `e:\code\shao\services\api.ts`

- [ ] **Step 1: 新增 claimActivityShare**

在 `getPointStatistics`（line 673 附近）后追加：

```ts
// 领取分享活动积分（每次 5 分、30 分钟一次、每日上限 4 次；冷却/上限超限抛错）
export async function claimActivityShare() {
  const res = await request('/zhao-point/v1/my/point/earn/share', {
    method: 'POST',
    data: { action: 'activity_share', source: 'activity' },
  })
  return res?.data ?? res
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api.ts
git commit -m "feat(shao): 新增领分享积分 API"
```

---

### Task 4: 新建 share-guide 分享引导组件

**Files:**
- Create: `e:\code\shao\components\share-guide\share-guide.vue`

- [ ] **Step 1: 创建组件模板 + 脚本 + 样式**

```vue
<template>
  <view class="sg-overlay" v-if="visible" @click="close">
    <view class="sg-modal" @click.stop>
      <text class="sg-title">分享活动得积分</text>
      <text class="sg-desc">每分享 1 次得 5 积分，每日最多 4 次，两次间隔 30 分钟</text>

      <view class="sg-channel" v-for="c in channels" :key="c.key">
        <view class="sg-phone">
          <view class="sg-topbar">
            <view class="sg-dots">
              <view v-for="i in 3" :key="i" class="sg-dot"></view>
            </view>
          </view>
          <view class="sg-arrow">{{ c.arrowText }}</view>
        </view>
        <text class="sg-channel-name">{{ c.name }}</text>
      </view>

      <view class="sg-actions">
        <view class="sg-btn cancel" @click="close">取消</view>
        <view class="sg-btn submit" @click="claim"><text>我已分享 · 领 5 积分</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { claimActivityShare } from '../../services/api'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', v: boolean): void; (e: 'claimed'): void }>()
const claiming = ref(false)

const channels = [
  { key: 'friend', name: '分享给好友', arrowText: '点右上角 ⋮ → 分享给好友' },
  { key: 'timeline', name: '分享到朋友圈', arrowText: '点右上角 ⋮ → 分享到朋友圈' },
]

function close() { emit('update:visible', false) }

async function claim() {
  if (claiming.value) return
  claiming.value = true
  try {
    await claimActivityShare()
    emit('claimed')
    close()
    uni.showToast({ title: '+5 积分已到账', icon: 'none' })
  } catch (e: any) {
    const msg = (e as any)?.response?.data?.error || (e as any)?.message || '领取失败'
    uni.showToast({ title: msg, icon: 'none', duration: 2000 })
  } finally {
    claiming.value = false
  }
}
</script>

<style lang="scss" scoped>
.sg-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 999; display: flex; align-items: flex-end; }
.sg-modal { width: 100%; background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 36rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); }
.sg-title { font-size: 34rpx; font-weight: bold; color: #333; display: block; text-align: center; }
.sg-desc { font-size: 24rpx; color: #999; display: block; text-align: center; margin: 12rpx 0 28rpx; line-height: 1.6; }
.sg-channel { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 20rpx; background: #f7f7f7; border-radius: 16rpx; margin-bottom: 16rpx; }
.sg-phone { width: 160rpx; height: 220rpx; background: #fff; border-radius: 16rpx; border: 2rpx solid #e0e0e0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 20rpx; }
.sg-topbar { display: flex; justify-content: flex-end; width: 100%; padding-right: 18rpx; }
.sg-dots { display: flex; gap: 6rpx; }
.sg-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #999; }
.sg-arrow { font-size: 18rpx; color: #667eea; background: #eef0ff; padding: 6rpx 12rpx; border-radius: 30rpx; margin-top: 20rpx; text-align: center; }
.sg-channel-name { font-size: 28rpx; color: #333; font-weight: 500; }
.sg-actions { display: flex; gap: 20rpx; margin-top: 28rpx; }
.sg-btn { flex: 1; text-align: center; padding: 24rpx; border-radius: 44rpx; font-size: 30rpx; }
.sg-btn.cancel { background: #f0f0f0; color: #666; }
.sg-btn.submit { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }
</style>
```

> 注：若项目对 props 直接改（uni-app 常用 `v-model:visible` 配合 `update:visible`），确保调用处用 `.sync` 语义绑定。组件内 `claimed` 事件让父页刷新任务计数。

- [ ] **Step 2: Commit**

```bash
git add components/share-guide/share-guide.vue
git commit -m "feat(shao): 分享引导示意图组件(微信好友/朋友圈)"
```

---

### Task 5: 任务中心接入分享任务

**Files:**
- Modify: `e:\code\shao\pages\tasks\tasks.vue`

- [ ] **Step 1: 引入 share-guide，卡片加"去分享"特殊处理**

模板 task-card 的 `status-todo` 区，分享任务改为点名按钮：

```vue
<view class="status-todo" v-else-if="task.action === 'activity_share'" @click.stop="openShareGuide">去分享</view>
```

- [ ] **Step 2: 引入组件与状态**

```vue
import ShareGuide from '../../components/share-guide/share-guide.vue'
const showShareGuide = ref(false)
function openShareGuide() { showShareGuide.value = true }
function onShareClaimed() { showShareGuide.value = false; loadTasks() }
```

并确保 `loadTasks()` 在 `onMounted`、且 `onShow` 也刷新（任务完成即时更新计数；直接把 onShow 挂上 loadTasks）。

- [ ] **Step 3: 模板底部挂 share-guide**

```vue
<ShareGuide :visible="showShareGuide" @update:visible="v => showShareGuide = v" @claimed="onShareClaimed" />
```

- [ ] **Step 4: 自检**

社交分组应出现「分享活动 +5积分、每日4次」卡片；对象未注册分享前显示「去分享」按钮，已满今日次数显示「已领完」。

- [ ] **Step 5: Commit**

```bash
git add pages/tasks/tasks.vue pages/tasks/pages.json task
git commit -m "feat(shao): 任务中心接入分享活动任务+引导"
```

---

### Task 6: 活动详情分享海报触发领分

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`

- [ ] **Step 1: 引入 claimActivityShare**

在 detail.vue 的 api 导入中加 `claimActivityShare`。

- [ ] **Step 2: 海报关闭时触发领分**

找到 `showSharePoster` 相关逻辑（line 465 附近 share-poster 组件、`showSharePoster = false` 处），在建图完成后触发一次领分（静默失败，不阻断）：

```ts
async function onSharePosterClosed() {
  showSharePoster.value = false
  try {
    await claimActivityShare()
    // 冷却/上限时静默忽略；成功可选轻提示
  } catch (e) {
    // 静默：不阻断查看海报
  }
}
```

将 share-poster 的 `@close` 改为 `@close="onSharePosterClosed"`。

> 说明：领分成功/失败均不硬提示，避免打扰。若需要即时反馈「+5」，可在此处成功后 toast，但会与海报页重复；按 YAGNI 本次静默。

- [ ] **Step 3: Commit**

```bash
git add pages/activity/detail.vue services/api.ts
git commit -m "feat(shao): 活动海报分享触发领分享积分"
```

---

### Task 7: 全链路验收 + 清理

**Files:**
- Modify（临时）：`e:\code\basic\plugins\zhao-point\scripts\accept-share-task.cjs`（已在 Task 2 创建，此处复核）

- [ ] **Step 1: 复核验收脚本覆盖 spec 全部场景**

确认涵盖：首次+5；30 分钟冷却拦截；冷却后放行；每日 4 次上限；跨天上限重置但冷却不重置（23:50 分享→次日仍需等）；两入口共用 action（同一请求即代表）。清理测试用户/积分记录。

Run: `node scripts/accept-share-task.cjs`
Expected: 全绿。

- [ ] **Step 2: 构建 C 端 h5 验证**

Run: `cd e:\code\shao && npm run build:h5`
Expected: Build complete，无 TS/编译错误。

- [ ] **Step 3: Commit 最终状态**

```bash
git add -A
git commit -m "feat: 活动分享转发任务全链路(后端+分享引导+C端) 完成"
```

---

## 自审（Self-Review）

**Spec 覆盖核对：**
- 新增 `activity_share` 规则 + bootstrap 说明（Task 1）✓
- 冷却校验「每次分享后重置」（Task 2）✓
- 每日上限 4 次 / 5 分（规则 points=5, limitPerDay=4，Task 1）✓
- C 端白名单领取接口（Task 2 earnShare）✓
- 任务中心卡片 + 分享引导（Task 5）✓
- 活动海报触发（Task 6）✓
- 分享操作示意图（好友/朋友圈，Task 4 share-guide）✓
- 跨天冷却不重置（Task 2 用 `createdAt` 倒序，天然以上次成功为准）✓

**占位符扫描：** 无 TBD/TODO；所有代码块完整。

**类型一致性：** `claimActivityShare`、`earnShare`、`cooldownRemainingMs`、`POINT_020` 命名在 Task 2/3/4/5/6 一致。`handleShare` 未用，统一用 `claim/claimActivityShare`。路由 `userRoute` 与现有 `sign-in` 一致。