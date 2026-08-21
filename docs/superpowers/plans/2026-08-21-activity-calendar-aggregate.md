# 活动日历聚合视图 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「按月聚合 + 访问惰性补齐」的活动日历聚合视图：C 端（shao）按月浏览已发布活动，管理端（web）按月查看含草稿在内的全部场次排期。

**Architecture:** 后端 zhao-point 插件新增 `calendar-service.getCalendarMonth`，先对"有排期且 active"的系列做滚动惰性补齐（复用 `series-service.generateSchedule`，幂等），再按本地 `YYYY-MM-DD` 分组返回 `{ days:[{date,activities}] }`。公开路由（C 端，仅已发布可报名）与管理路由（全状态）共享该服务，前端各自渲染月历 + 日视图。前端均为 uni-app，`/zhao-point/v1/activities` 已在 PUBLIC_ROUTES 前缀覆盖日历公开 URL，无需再改白名单。

**Tech Stack:** Strapi v5 插件（zhao-point）、uni-app（shao C 端 / web 管理端）、TypeScript、`strapi-plugin build`。

---

## 文件结构

| 仓库 | 操作 | 文件 |
|---|---|---|
| basic | 新增 | `plugins/zhao-point/server/src/services/calendar-service.ts` |
| basic | 改为 | `plugins/zhao-point/server/src/services/index.ts` |
| basic | 新增 | `plugins/zhao-point/server/src/controllers/calendar.ts` |
| basic | 改为 | `plugins/zhao-point/server/src/controllers/index.ts` |
| basic | 改为 | `plugins/zhao-point/server/src/routes/content-api.ts` |
| basic | 新增 | `scripts/accept-calendar.cjs` |
| shao | 新增 | `pages/activity/calendar.vue` |
| shao | 改为 | `services/api.ts`、`pages/activity/list.vue`、`pages/index/index.vue`、`pages.json` |
| web | 新增 | `src/pages/activity/calendar.vue` |
| web | 改为 | `src/api/activity.js`、`src/pages/activity/list.vue`、src pages.json |

---

## Task 1: 后端 `calendar-service`（按月聚合 + 惰性补齐）

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\services\calendar-service.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\services\index.ts`

- [ ] **Step 1: 创建 `calendar-service.ts`**

```typescript
import type { Core } from "@strapi/strapi";

const SERIES_UID = "plugin::zhao-point.activity-series";
const ACTIVITY_UID = "plugin::zhao-point.activity";

/** 解析 YYYY-MM，返回本地时区该月 [start, end) 边界；非法输入返回 null */
function monthRange(month: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec((month || "").trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const mon = parseInt(m[2], 10);
  if (mon < 1 || mon > 12) return null;
  // Date(year, mon-1, ...) 按本地时区构造，得到该月本地 0 点
  return {
    start: new Date(year, mon - 1, 1, 0, 0, 0, 0),
    end: new Date(year, mon, 1, 0, 0, 0, 0),
  };
}

/** 活动 startTime（Date）按本地时区转 YYYY-MM-DD */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 按月聚合活动：
   * 1. 先对"有排期且 active"的系列做滚动惰性补齐（复用 series-service.generateSchedule，幂等，只填到 generateWeeks）；
   * 2. 按 startTime 落在该月（本地时区）过滤活动；
   * 3. includeAllStatus=true 返回全部状态（管理端），=false 仅 signup_open/ongoing（C端）；
   * 4. 按本地 YYYY-MM-DD 分组，返回 { days: [{ date, activities }] }；空月返回 days: []。
   */
  async getCalendarMonth({ month, includeAllStatus }: { month?: string; includeAllStatus?: boolean } = {}) {
    const range = monthRange(month || "");
    if (!range) return { days: [] };

    const seriesSvc = strapi.plugin("zhao-point").service("series-service");
    const seriesList = await strapi.documents(SERIES_UID).findMany({ filters: { status: "active" } });
    for (const s of seriesList) {
      if (s.schedule && Array.isArray(s.schedule.weekdays) && s.schedule.weekdays.length > 0) {
        await seriesSvc.generateSchedule(s.documentId);
      }
    }

    const rows = await strapi.db.query(ACTIVITY_UID).findMany({
      where: {
        ...(includeAllStatus ? {} : { status: { $in: ["signup_open", "ongoing"] } }),
        startTime: { $gte: range.start.toISOString(), $lt: range.end.toISOString() },
      },
      orderBy: { startTime: "asc" },
    });

    const byDay = new Map<string, any[]>();
    for (const r of rows) {
      const key = localDateKey(new Date(r.startTime));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r);
    }

    const days = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, activities]) => ({ date, activities }));

    return { days };
  },
});
```

- [ ] **Step 2: 注册服务**

在 `e:\code\basic\plugins\zhao-point\server\src\services\index.ts` 中「series-service」导入下方新增一行：

```typescript
import calendarService from "./calendar-service";
```

并把默认导出对象末尾（`"series-service": seriesService,` 之后）追加：

```typescript
  "calendar-service": calendarService,
```

- [ ] **Step 3: 编译插件 + 重启**

在插件目录编译（会执行 `strapi-plugin build`，重编译 server dist）：

```bash
cd e:\code\basic\plugins\zhao-point ; npm run build
```

随后按本阶段既有方式重启本地 Strapi（开发 1337；若用 pm2 管理再 `pm2 restart`）使新服务与类型生效。

---

## Task 2: 后端 calendar 控制器 + 路由

**Files:**
- Create: `e:\code\basic\plugins\zhao-point\server\src\controllers\calendar.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts`
- Modify: `e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts`

- [ ] **Step 1: 创建 `calendar.ts`**

```typescript
import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-point").service("calendar-service");
  return ({
    // GET /activities/calendar?month=YYYY-MM  — C端：仅已发布可报名
    async month(ctx: any) {
      try {
        ctx.body = wrap(await svc().getCalendarMonth({ month: ctx.query.month, includeAllStatus: false }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
    // GET /adm/activities/calendar?month=YYYY-MM  — 管理端：全部状态
    async adminMonth(ctx: any) {
      try {
        ctx.body = wrap(await svc().getCalendarMonth({ month: ctx.query.month, includeAllStatus: true }));
      } catch (e: any) {
        ctx.status = (e as any).status || 400;
        ctx.body = { error: e.message };
      }
    },
  });
};
```

- [ ] **Step 2: 注册控制器**

在 `e:\code\basic\plugins\zhao-point\server\src\controllers\index.ts` 中 `import series from "./series";` 之后新增 `import calendar from "./calendar";`，并在导出对象中追加 `calendar,`。

- [ ] **Step 3: 追加路由**

`e:\code\basic\plugins\zhao-point\server\src\routes\content-api.ts` 两处：

1. **公开日历路由必须放在 `/activities/:documentId` 之前**（避免被动态段拦截）：

```typescript
    publicRoute("GET", "/activities", "activity.list"),
    publicRoute("GET", "/activities/calendar", "calendar.month"),
    publicRoute("GET", "/activities/:documentId", "activity.detail"),
```

2. 在管理端活动列表路由之后追加（`GET /adm/activities/calendar` 无同段名 GET，无冲突）：

```typescript
    channelScopeRoute("GET", "/adm/activities", "activity.adminList", "activity.read"),
    channelScopeRoute("GET", "/adm/activities/calendar", "calendar.adminMonth", "activity.read"),
```

- [ ] **Step 4: 编译 + 重启**

```bash
cd e:\code\basic\plugins\zhao-point ; npm run build
```

重启本地 Strapi。改完后可用 `curl "http://localhost:1337/zhao-point/v1/activities/calendar?month=$(date +%Y-%m)"` 快速确认不 404。

---

## Task 3: 后端验收脚本 `accept-calendar.cjs`

**Files:**
- Create: `e:\code\basic\scripts\accept-calendar.cjs`

- [ ] **Step 1: 复用既有测试台架**

从 `scripts/accept-series.cjs` 开头复制：admin 登录辅助（`login('1117','a123456')`）、`api(method, url, {token, body, query})` 请求辅助、Strapi DB 直连 pg 客户端（用于查 `activities` / `activity_series` 及 join 表、清库）与末尾「清理零残留」辅助。保留这些函数与文件头；仅替换脚本主体为下列校验。

- [ ] **Step 2: 编写校验主体**

```javascript
// 在台架变量（api/login/db 等）就绪后执行
const checks = (name, cond, extra='') => console.log(`${cond?'PASS':'FAIL'} - ${name} ${extra}`)

function pad(n){ return String(n).padStart(2,'0') }
function inMonthISO(m, day, hh='10', mm='00'){ // 东八区某月某日 -> ISO
  const d = new Date(`${m}-${pad(day)}T${hh}:${mm}:00+08:00`)
  return d.toISOString()
}

// ---- 准备：建带排期的系列 + 该月已发布/草稿活动 ----
const YM = new Date().toISOString().slice(0,7) // 当前月，东八区可能跨日不影响 generate
const adminToken = (await login('1117','a123456')).jwt
const series = (await api('POST','/zhao-point/v1/admin/adm/series',{token:adminToken,body:{title:'验收-日历系列', status:'active', schedule:{weekdays:[1,3,5], startTime:'10:00', durationMin:60, generateWeeks:8}}})).json?.data
checks('创建日历系列', !!series?.documentId)

const pub = (await api('POST','/zhao-point/v1/admin/adm/activities',{token:adminToken,body:{title:'验收-已发布活动', status:'signup_open', startTime:inMonthISO(YM,1), endTime:inMonthISO(YM,1,11), capacity:10}})).json?.data
const draft = (await api('POST','/zhao-point/v1/admin/adm/activities',{token:adminToken,body:{title:'验收-草稿活动', status:'draft', startTime:inMonthISO(YM,2), endTime:inMonthISO(YM,2,11), capacity:10}})).json?.data
checks('创建已发布+草稿活动', !!pub?.documentId && !!draft?.documentId)

// ---- 断言 ----
// 1) C 端：只含该月、只含 signup_open/ongoing、不含 draft
const pubCal = (await api('GET','/zhao-point/v1/activities/calendar?month='+YM)).json?.data
const pubDays = (pubCal?.days ?? []).flatMap(d=>d.activities)
checks('C端按月返回', pubDays.every(a=>a.startTime && a.startTime.slice(0,7)===YM), 'count='+pubDays.length)
checks('C端不含草稿', !pubDays.some(a=>a.status==='draft') && pubDays.some(a=>a.title==='验收-已发布活动'))

// 2) 管理端：含该月草稿
const admCal = (await api('GET','/zhao-point/v1/admin/adm/activities/calendar?month='+YM,{token:adminToken})).json?.data
const admDays = (admCal?.days ?? []).flatMap(d=>d.activities)
checks('管理端含草稿', admDays.some(a=>a.title==='验收-草稿活动'))

// 3) 惰性补齐：浏览后系列生成草稿场次，且重复浏览不重复建（幂等）
const before = await db.count('activities', `belongs_to_series=${series.id}`)
await api('GET','/zhao-point/v1/activities/calendar?month='+YM)
const after1 = await db.count('activities', `belongs_to_series=${series.id}`)
await api('GET','/zhao-point/v1/activities/calendar?month='+YM)
const after2 = await db.count('activities', `belongs_to_series=${series.id}`)
checks('惰性补齐生成场次', after1 > before, `before=${before} after=${after1}`)
checks('重复浏览幂等', after2 === after1, `${after1}->${after2}`)

// 4) 空月
const emptyCal = (await api('GET','/zhao-point/v1/activities/calendar?month=2099-01')).json?.data
checks('空月返回空 days', Array.isArray(emptyCal?.days) && emptyCal.days.length===0)

// ---- 清理 ----
await api('DELETE', `/zhao-point/v1/admin/adm/activities/${pub.documentId}`, {token:adminToken})
await api('DELETE', `/zhao-point/v1/admin/adm/activities/${draft.documentId}`, {token:adminToken})
await api('DELETE', `/zhao-point/v1/admin/adm/series/${series.documentId}`, {token:adminToken})
// 再清残留 join（同 accept-series 的清理段），末尾断言所有含"验收-"标题的行=0
```

> 说明：`db.count` 与 join 清理沿用台架逻辑；`inMonthISO` 用 `+08:00` 固定东八区，避免月份边界跨 UTC 错位。若 targetMonth 场次太少影响「已发布」断言，可把 `pub` 的日期落在 `YM-01`（月初）以稳含当月。

- [ ] **Step 3: 运行**

```bash
node scripts/accept-calendar.cjs
```

期望：全部 PASS，末尾清理后无「验收-」残留。

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point scripts/accept-calendar.cjs
git commit -m "feat(activity): 活动日历聚合视图后端日历接口"
```

---

## Task 4: shao C 端日历页 + 双入口

**Files:**
- Create: `e:\code\shao\pages\activity\calendar.vue`
- Modify: `e:\code\shao\services\api.ts`、`e:\code\shao\pages\activity\list.vue`、`e:\code\shao\pages\index\index.vue`、`e:\code\shao\pages.json`（注册路径）

- [ ] **Step 1: `services/api.ts` 追加日历接口**

在「活动系列相关 API」之后追加：

```typescript
// 活动日历聚合（公开，按月；data.days = [{ date, activities }]）
export async function getActivityCalendar(month: string) {
  return request(`/zhao-point/v1/activities/calendar?month=${month}`)
}
```

> `/zhao-point/v1/activities/calendar` 已被 PUBLIC_ROUTES 中 `/zhao-point/v1/activities` 前缀覆盖（startsWith），游客可访问，**无需改白名单**。

- [ ] **Step 2: 创建 `pages/activity/calendar.vue`**

```vue
<template>
  <view class="cal-page">
    <view class="cal-header">
      <view class="cal-nav" @click="changeMonth(-1)">‹</view>
      <view class="cal-title">{{ year }}年{{ month }}月</view>
      <view class="cal-nav" @click="changeMonth(1)">›</view>
    </view>

    <view class="cal-week">
      <view v-for="(w, i) in weekNames" :key="i" class="cal-week-cell">{{ w }}</view>
    </view>

    <view class="cal-grid">
      <view
        v-for="(cell, i) in grid"
        :key="i"
        :class="['cal-cell', {
          'is-dim': !cell.inMonth,
          'is-active': cell.inMonth && cell.isActive && !cell.isSelected,
          'is-selected': cell.isSelected,
        }]"
        @click="cell.inMonth && selectDay(cell.dateStr)"
      >
        <text class="cal-day">{{ cell.dayNumber }}</text>
        <view v-if="cell.isActive" class="cal-dot"></view>
      </view>
    </view>

    <view class="day-section">
      <view class="day-title">{{ dayLabel }}</view>
      <view v-if="selectedActivities.length" class="activity-list">
        <view
          v-for="item in selectedActivities"
          :key="item.documentId || item.id"
          class="activity-item"
          @click="goDetail(item)"
        >
          <view class="item-top">
            <text class="item-title">{{ item.title }}</text>
            <text :class="['status-tag', `status-${item.status}`]">{{ statusText(item.status) }}</text>
          </view>
          <view class="item-time">
            <text class="time-value">{{ formatTime(item.startTime) }} ~ {{ formatTime(item.endTime) }}</text>
          </view>
          <view class="item-venue">
            <text class="venue-icon">📍</text>
            <text class="venue-name">{{ item.venueName || '待定场地' }}</text>
          </view>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-day">当天暂未开放活动</view>
    </view>

    <view v-if="loading" class="loading-more"><text>加载中...</text></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getActivityCalendar } from '../../services/api'

const weekNames = ['一', '二', '三', '四', '五', '六', '日']
const year = ref<number>(new Date().getFullYear())
const month = ref<number>(new Date().getMonth() + 1)
const selectedDate = ref<string>('')
const activeDays = ref<Map<string, any[]>>(new Map())
const loading = ref(false)

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const firstOffset = computed(() => (new Date(year.value, month.value - 1, 1).getDay() + 6) % 7)

const grid = computed(() => {
  const cells: any[] = []
  for (let i = 0; i < 42; i++) {
    const dayNumber = i - firstOffset.value + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth.value
    const dateStr = inMonth
      ? `${year.value}-${String(month.value).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
      : ''
    cells.push({ dateStr, dayNumber: inMonth ? dayNumber : '', inMonth, isActive: inMonth && activeDays.value.has(dateStr), isSelected: dateStr === selectedDate.value })
  }
  return cells
})

const dayLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekNames[(d.getDay() + 6) % 7]}`
})
const selectedActivities = computed(() => activeDays.value.get(selectedDate.value) || [])

function statusText(status: string): string {
  return ({ draft: '未开放', signup_open: '报名中', ongoing: '进行中', ended: '已结束' } as Record<string, string>)[status] ?? status ?? ''
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function goDetail(item: any) {
  const id = item.documentId || item.id
  uni.navigateTo({ url: `/pages/activity/detail?id=${id}` })
}

function ym(): string {
  return `${year.value}-${String(month.value).padStart(2, '0')}`
}

function selectDay(dateStr: string) { selectedDate.value = dateStr }

async function loadMonth() {
  loading.value = true
  try {
    const res: any = await getActivityCalendar(ym())
    const days = res?.data?.days ?? []
    const map = new Map<string, any[]>()
    for (const day of days) map.set(day.date, day.activities || [])
    activeDays.value = map
    if (!map.has(selectedDate.value)) {
      selectedDate.value = days.length ? days[0].date : ''
    }
  } catch (e) {
    console.error('加载活动日历失败', e)
  } finally {
    loading.value = false
  }
}

function changeMonth(delta: number) {
  month.value += delta
  if (month.value > 12) { month.value = 1; year.value++ }
  if (month.value < 1) { month.value = 12; year.value-- }
  selectedDate.value = ''
  loadMonth()
}

onLoad(() => {
  const now = new Date()
  selectedDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  loadMonth()
})
</script>

<style lang="scss" scoped>
.cal-page { min-height: 100vh; background: #f5f5f5; padding: 20rpx 30rpx 40rpx; }
.cal-header { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; }
.cal-nav { font-size: 44rpx; color: #666; padding: 0 30rpx; }
.cal-title { font-size: 32rpx; font-weight: 600; color: #333; }
.cal-week { display: flex; background: #fff; border-top: 1rpx solid #f0f0f0; }
.cal-week-cell { flex: 1; text-align: center; font-size: 24rpx; color: #999; padding: 16rpx 0; }
.cal-grid { display: flex; flex-wrap: wrap; background: #fff; border-top: 1rpx solid #f0f0f0; padding-bottom: 10rpx; }
.cal-cell { width: 14.28%; height: 88rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.cal-day { font-size: 28rpx; color: #333; }
.is-dim .cal-day { color: #ccc; }
.is-active .cal-day { color: #667eea; font-weight: 600; }
.is-selected .cal-day { color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 56rpx; height: 56rpx; text-align: center; line-height: 56rpx; border-radius: 50%; }
.cal-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #ff7875; position: absolute; bottom: 10rpx; }
.is-selected .cal-dot { bottom: 2rpx; }
.day-section { margin-top: 20rpx; }
.day-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.activity-list { display: flex; flex-direction: column; gap: 16rpx; }
.activity-item { background: #fff; padding: 24rpx; border-radius: 16rpx; }
.item-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12rpx; }
.item-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #333; margin-right: 12rpx; }
.status-tag { flex-shrink: 0; font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; }
.status-signup_open { background: #e6f7ff; color: #1890ff; }
.status-ongoing { background: #f6ffed; color: #52c41a; }
.status-ended { background: #f5f5f5; color: #999; }
.status-draft { background: #f0f0f0; color: #bbb; }
.item-time { margin-bottom: 8rpx; }
.time-value { font-size: 26rpx; color: #666; }
.item-venue { display: flex; align-items: center; }
.venue-icon { font-size: 24rpx; margin-right: 8rpx; }
.venue-name { font-size: 26rpx; color: #666; }
.empty-day { background: #fff; border-radius: 16rpx; padding: 60rpx 0; text-align: center; font-size: 26rpx; color: #999; }
.loading-more { text-align: center; padding: 30rpx; font-size: 26rpx; color: #999; }
</style>
```

- [ ] **Step 3: `pages.json` 注册日历页**

在 `pages/activity/list` 附近追加一条：

```json
{ "path": "pages/activity/calendar", "style": { "enablePullDownRefresh": false } }
```

- [ ] **Step 4: shao 活动列表加「日历」入口**

在 `e:\code\shao\pages\activity\list.vue` 的模板顶部加一个顶部条（若 page 已有 header 则在其右加入口）：

```vue
<template>
  <view class="page-container">
    <view class="list-top">
      <text class="top-title">线下活动</text>
      <view class="top-cal" @click="goCalendar">📅 日历</view>
    </view>
    <!-- 原 .activity-list .empty-state 等保持不变 -->
```

对应在 `<script setup>` 加 `onLoad` 之外的跳转（无库差异，直接函数）：

```typescript
function goCalendar() {
  uni.navigateTo({ url: '/pages/activity/calendar' })
}
```

并追加样式：

```scss
.list-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.top-title { font-size: 34rpx; font-weight: 600; color: #333; }
.top-cal { font-size: 28rpx; color: #667eea; padding: 8rpx 16rpx; }
```

- [ ] **Step 5: shao 首页加「活动日历」入口**

在 `e:\code\shao\pages\index\index.vue` 现有「近期活动」区块标题右侧追加可点击「日历」链接（若无该区块标题条，则在首页活动相关卡片顶部加一个入口行）：

```vue
<view class="section-head" @click="goActivityCalendar">
  <text class="section-title">活动日历</text>
  <text class="section-more">»</text>
</view>
```

并在该页 script 追加：

```typescript
function goActivityCalendar() {
  uni.navigateTo({ url: '/pages/activity/calendar' })
}
```

按该页既有 `.section-*` 样式复用；若首页为路由跳转 tab，`navigateTo` 即可（日历为非 tab 页）。

- [ ] **Step 6: 构建并提交（shao）**

```bash
cd e:\code\shao
npm run build:h5        # set UNI_INPUT_DIR=%cd% && uni build；dist/build/h5 被 git 跟踪需提交
git add pages/activity/calendar.vue services/api.ts pages/activity/list.vue pages/index/index.vue pages.json dist/build/h5
git commit -m "feat(activity): C端活动日历聚合视图 + 双入口"
```

---

## Task 5: web 管理端日历视图

**Files:**
- Modify: `e:\code\web\src\api\activity.js`
- Create: `e:\code\web\src\pages\activity\calendar.vue`
- Modify: `e:\code\web\src\pages\activity\list.vue`、`e:\code\web\pages.json`（注册路径）

- [ ] **Step 1: `src/api/activity.js` 追加接口**

在活动系列 API 之后追加：

```javascript
// 活动日历聚合（按月，管理端全状态；返回原始体 { data: { days: [{ date, activities }] } }）
export function getAdminActivityCalendar(month) {
  return get(`${ADMIN}/activities/calendar?month=${month}`)
}
```

- [ ] **Step 2: 创建 `src/pages/activity/calendar.vue`**

管理端月历 + 当日全状态场次（含草稿色标），点击场次跳转编辑：

```vue
<template>
  <view class="page-container">
    <PageHeader title="活动日历">
      <text class="cal-hint">含草稿全状态</text>
    </PageHeader>

    <view class="cal-panel">
      <view class="cal-header">
        <view class="cal-nav" @click="changeMonth(-1)">‹</view>
        <text class="cal-title">{{ year }}年{{ month }}月</text>
        <view class="cal-nav" @click="changeMonth(1)">›</view>
      </view>
      <view class="cal-week">
        <view v-for="(w, i) in weekNames" :key="i" class="cal-week-cell">{{ w }}</view>
      </view>
      <view class="cal-grid">
        <view
          v-for="(cell, i) in grid"
          :key="i"
          :class="['cal-cell', { 'is-dim': !cell.inMonth, 'is-active': cell.inMonth && cell.isActive && !cell.isSelected, 'is-selected': cell.isSelected }]"
          @click="cell.inMonth && selectDay(cell.dateStr)"
        >
          <text class="cal-day">{{ cell.dayNumber }}</text>
          <view v-if="cell.isActive" class="cal-dot"></view>
        </view>
      </view>
    </view>

    <view class="day-section">
      <view class="day-title">{{ dayLabel }} · {{ selectedActivities.length }} 场</view>
      <view v-for="item in selectedActivities" :key="item.documentId || item.id" class="activity-card" @click="goEdit(item)">
        <view class="card-header">
          <text class="card-title">{{ item.title || '-' }}</text>
          <text class="status-badge" :class="statusClass(item.status)">{{ statusText(item.status) }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">🕐 {{ formatTime(item.startTime) }}</text>
          <text class="meta-item">📍 {{ item.venueName || '-' }}</text>
        </view>
        <view class="card-meta">
          <text class="meta-item">容量: {{ item.capacity ?? '-' }}</text>
          <text class="meta-item">已用: {{ item.usedCapacity ?? 0 }}</text>
        </view>
      </view>
      <view v-if="!loading && selectedActivities.length === 0" class="empty-day">当天无场次</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAdminActivityCalendar } from '../../api/activity.js'
import PageHeader from '../../components/PageHeader.vue'

const weekNames = ['一', '二', '三', '四', '五', '六', '日']
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const selectedDate = ref('')
const dayMap = ref(new Map())
const loading = ref(false)

const statusTextMap = { draft: '草稿', signup_open: '报名中', ongoing: '进行中', ended: '已结束' }
const statusClassMap = { draft: 'draft', signup_open: 'open', ongoing: 'ongoing', ended: 'ended' }
function statusText(s) { return statusTextMap[s] || s || '-' }
function statusClass(s) { return statusClassMap[s] || 'default' }

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const firstOffset = computed(() => (new Date(year.value, month.value - 1, 1).getDay() + 6) % 7)

const grid = computed(() => {
  const cells = []
  for (let i = 0; i < 42; i++) {
    const dayNumber = i - firstOffset.value + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth.value
    const dateStr = inMonth ? `${year.value}-${pad(month.value)}-${pad(dayNumber)}` : ''
    cells.push({ dateStr, dayNumber: inMonth ? dayNumber : '', inMonth, isActive: inMonth && dayMap.value.has(dateStr), isSelected: dateStr === selectedDate.value })
  }
  return cells
})

const dayLabel = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(`${selectedDate.value}T00:00:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekNames[(d.getDay() + 6) % 7]}`
})
const selectedActivities = computed(() => dayMap.value.get(selectedDate.value) || [])

function pad(n) { return String(n).padStart(2, '0') }
function todayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function selectDay(dateStr) { selectedDate.value = dateStr }
function goEdit(item) { uni.navigateTo({ url: `/pages/activity/form?id=${item.documentId}` }) }

async function loadMonth() {
  loading.value = true
  try {
    const res = await getAdminActivityCalendar(`${year.value}-${pad(month.value)}`)
    const days = res?.data?.days ?? []
    const map = new Map()
    for (const day of days) map.set(day.date, day.activities || [])
    dayMap.value = map
    if (!map.has(selectedDate.value)) selectedDate.value = days.length ? days[0].date : ''
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function changeMonth(delta) {
  month.value += delta
  if (month.value > 12) { month.value = 1; year.value++ }
  if (month.value < 1) { month.value = 12; year.value-- }
  selectedDate.value = ''
  loadMonth()
}

onLoad(() => {
  selectedDate.value = todayStr(new Date())
  loadMonth()
})
</script>

<style scoped>
page { background: #f5f5f5; }
.page-container { min-height: 100vh; padding: 20rpx; box-sizing: border-box; }
.cal-hint { font-size: 24rpx; color: #999; }
.cal-panel { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; }
.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 24rpx; }
.cal-nav { font-size: 44rpx; color: #666; padding: 0 30rpx; }
.cal-title { font-size: 32rpx; font-weight: 600; color: #333; }
.cal-week { display: flex; border-top: 1rpx solid #f0f0f0; }
.cal-week-cell { flex: 1; text-align: center; font-size: 24rpx; color: #999; padding: 16rpx 0; }
.cal-grid { display: flex; flex-wrap: wrap; border-top: 1rpx solid #f0f0f0; padding-bottom: 10rpx; }
.cal-cell { width: 14.28%; height: 88rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.cal-day { font-size: 28rpx; color: #333; }
.is-dim .cal-day { color: #ccc; }
.is-active .cal-day { color: #667eea; font-weight: 600; }
.is-selected .cal-day { color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 56rpx; height: 56rpx; text-align: center; line-height: 56rpx; border-radius: 50%; }
.cal-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #ff7875; position: absolute; bottom: 10rpx; }
.day-section { }
.day-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.activity-card { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 16rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.card-title { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; margin-right: 12rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 16rpx; flex-shrink: 0; }
.status-badge.draft { background: #f5f5f5; color: #999; }
.status-badge.open { background: #e6f7ff; color: #1890ff; }
.status-badge.ongoing { background: #fff7e6; color: #fa8c16; }
.status-badge.ended { background: #f6ffed; color: #52c41a; }
.status-badge.default { background: #f5f5f5; color: #666; }
.card-meta { display: flex; gap: 16rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.meta-item { font-size: 24rpx; color: #999; }
.empty-day { background: #fff; border-radius: 12rpx; padding: 60rpx 0; text-align: center; font-size: 26rpx; color: #999; }
</style>
```

- [ ] **Step 3: `pages.json` 注册日历页**

在 web 工程 `pages.json` 的 `pages/activity/list` 附近追加：

```json
{ "path": "pages/activity/calendar", "style": { "navigationBarTitleText": "活动日历" } }
```

- [ ] **Step 4: web 活动列表加「日历视图」入口**

`e:\code\web\src\pages\activity\list.vue` 的 `PageHeader` 内，在「+ 新建活动」按钮旁新增：

```vue
<PageHeader title="线下活动">
  <view class="btn-group">
    <button class="btn-primary" @click="goCalendar">📅 日历视图</button>
    <button class="btn-primary" @click="goCreate">+ 新建活动</button>
  </view>
</PageHeader>
```

对应 `<script setup>` 新增：

```javascript
function goCalendar() {
  uni.navigateTo({ url: '/pages/activity/calendar' })
}
```

并补充 `.btn-group { display: flex; gap: 16rpx; }` 样式。

- [ ] **Step 5: 构建并提交（web）**

```bash
cd e:\code\web
npm run build            # 生成 dist/build/h5 并提交
git add src/api/activity.js src/pages/activity/calendar.vue src/pages/activity/list.vue pages.json dist/build/h5
git commit -m "feat(activity): 管理端活动日历聚合视图 + 入口"
```

---

## Task 6: 三仓库收口推送 + 记忆更新

**Files:**
- Modify: `e:\code\basic\docs\superpowers\specs\2026-08-21-activity-calendar-aggregate-design.md`（已存在）、`e:\code\basic\plugins\.../dist`（构建产物）

- [ ] **Step 1: 提交 basic 插件 dist + 验收脚本 + spec**

在 basic 仓库确认插件 `dist`（编译产物）、`scripts/accept-calendar.cjs`、spec 都已提交并推送 `origin/main`。

```bash
cd e:\code\basic
git status
git add -A && git commit -m "feat(activity): 活动日历聚合视图（后端+验收）"
git push origin main
```

> 若 git status 出现 app 顶层 `dist/` 被误改，仅 `git restore dist/` 还原（勿用 `git checkout -- .`）。

- [ ] **Step 2: shao / web 推送**

```bash
cd e:\code\shao ; git status && git add -A && git commit -m "feat(activity): C端活动日历" && git push origin main
cd e:\code\web  ; git status && git add -A && git commit -m "feat(activity): 管理端活动日历" && git push origin main
```

- [ ] **Step 3: 复核三仓库 `git status` 干净、`git log origin/main..HEAD` 为空**

- [ ] **Step 4: 更新记忆**

在 `c:\Users\Administrator\.trae-cn\memory\projects\-e-code--p2-3a5c4f0315cfc1daa3fd\project_memory.md` 追加「阶段十三：活动日历聚合视图」小节：交付内容、关键文件、接口契约、1 个问题 + 1 个改进、待办（浏览器双轨实测日历页、部署上线仍在待办）。并从待排期清单移除「活动日历聚合视图」（若曾列出）。

---

## Self-Review Notes

- **Spec coverage：** 服务/路由/状态过滤/惰性补齐/空月/两端页面/入口/验收 均在 Task 1–6 全覆盖。
- **路由顺序：** 公开日历路由已置于 `/activities/:documentId` 之前（Task 2 Step 3），避免被动态段拦截。
- **白名单：** `/zhao-point/v1/activities` 前缀已覆盖日历公开 URL，无需改 shao PUBLIC_ROUTES。
- **类型一致性：** `getCalendarMonth({month, includeAllStatus})` 返回 `{days:[{date,activities}]}` 在 Task 4/5 两处消费端读取 `res.data.days` 一致。
- **时区：** 服务用本地 `Date(y,m,1)` 边界 + 本地 `getFullYear/getMonth/getDate` 分组，前端 `new Date('YYYY-MM-DDT00:00:00')` 本地解析，两端对齐。