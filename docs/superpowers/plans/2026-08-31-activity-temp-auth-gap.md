# 线下活动闭环补漏（手动授权入口 + 越权校验）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为活动临时课时功能补上运营端手动授权入口（B），并堵住「课时被移出活动临时开放列表后仍被放行」的越权口（C）。

**Architecture:** C 为 zhao-point service 的 `isLessonTempAuthorized` 增加活动归属回查（授权记录 `activityDocumentId` 对应活动的 `tempLessonMode !== 'none'` 且 `preUnlockLessons` 仍含该课时）；B 为 web 运营端两处前端改动（`temp-auth.vue` 支持 `activityId` 预选 + `list.vue` 活动项加「临时授权」按钮跳转）。

**Tech Stack:** Strapi zhao-point 插件（TypeScript service）；uni-app HBuilder X web 运营端（Vue3 `<script setup>`，`onLoad` from `@dcloudio/uni-app`）。

> 注：本仓库无独立单测基建（Strapi 插件 + uni-app），各任务以「精确代码改动 + 人工验收要点」收尾，不套用不存在的测试框架。部署遵循既有脚本约定（禁止裸命令）。

---

## 变更文件总览

| 仓库 | 文件 | 改动 |
|---|---|---|
| `basic` | `plugins/zhao-point/server/src/services/activity.ts` | C：`isLessonTempAuthorized` 增加活动归属回查 |
| `basic` | `plugins/zhao-point/dist` | C：`server/src` 改动后必须 `npm run build` 重建并提交 |
| `web` | `src/pages/activity/temp-auth.vue` | B：抽出 `applyActivity` + `onLoad` 支持 `activityId` 预选 |
| `web` | `src/pages/activity/list.vue` | B：活动操作区加「临时授权」按钮 + `goTempAuth` |

---

## Task 1: 后端越权校验（basic · zhao-point）

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts:1092-1103`（`isLessonTempAuthorized`）
- Build: `plugins/zhao-point/dist`（重建产物）

**背景**：`isLessonTempAuthorized` 当前只校验「存在未过期、`authType=temp_lesson`、lesson 匹配的授权」，未回查活动是否仍开放该课时。若运营把课时移出活动 `preUnlockLessons`、或把 `tempLessonMode` 改为 `none`、或删除活动，已授权用户仍能播放（越权）。本任务在确保授权存在后追加活动归属校验。

- [ ] **Step 1: 记录当前实现基线**

`isLessonTempAuthorized` 位于 [activity.ts:1092](file:///e:/code/basic/plugins/zhao-point/server/src/services/activity.ts#L1092-L1103)。现有实现仅返回 `no_auth` / `{authorized:true, auth}`，无活动回查。

- [ ] **Step 2: 改写 `isLessonTempAuthorized` 加入活动归属回查**

将方法体替换为：

```ts
/** 单课时临时授权判定：是否仍有效（活动期内、未过期、且活动仍开放该课时） */
async isLessonTempAuthorized({ userId, lessonDocumentId }: { userId: number; lessonDocumentId: string }) {
  const auth = await strapi.db.query(AUTH_UID).findOne({
    where: {
      user: userId, authType: "temp_lesson", lessonDocumentId,
      isExpired: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date().toISOString() } }],
    },
  });
  if (!auth) return { authorized: false, reason: "no_auth" };

  // 堵越权：回查授权关联活动是否仍开放此课时。
  // 存量授权无 activityDocumentId 时跳过回查，维持兼容放行，不误伤老数据。
  const actId = auth.activityDocumentId;
  if (actId) {
    const act = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { documentId: actId },
      populate: { preUnlockLessons: { select: ["documentId"] } },
    });
    const stillOpen =
      !!act &&
      act.tempLessonMode !== "none" &&
      (act.preUnlockLessons || []).some(
        (l: any) => l.documentId === lessonDocumentId || l.id === lessonDocumentId
      );
    if (!stillOpen) return { authorized: false, reason: "removed_from_activity" };
  }

  return { authorized: true, auth };
}
```

> 常量 `AUTH_UID`、`ACTIVITY_UID` 已在文件顶部定义（见 [activity.ts:6-7](file:///e:/code/basic/plugins/zhao-point/server/src/services/activity.ts#L6-L7)），无需新增。`tempLessonMode` 为 activity 自身列，`db.query(...).findOne` 直接返回普通字段；`preUnlockLessons` 为 manyToMany，经 `populate` 取 `documentId`（与 `adminGrantTempLesson` L1110-1116 同款取法）。

- [ ] **Step 3: 重建插件 dist（记忆铁律，必须执行）**

Strapi 加载的是 `dist` 而非 `src`。必须重建并提交 dist，否则后端改动静默失效。

```bash
# 在 /e:/code/basic/plugins/zhao-point 下
npm run build
```

预期：`plugins/zhao-point/dist/server` 下生成更新后的产物文件，无构建错误。

- [ ] **Step 4: 自查 —— 校验 dist 已含新逻辑**

在 `plugins/zhao-point/dist` 中检索关键字：

```
removed_from_activity
```

预期：至少有 1 处命中（说明 dist 已包含本次越权判定）。

- [ ] **Step 5: 人工验收要点（功能验证前一并在部署阶段做）**

- 场景① 课时被移出活动 `preUnlockLessons` → 原授权用户调用 `GET /api/zhao-point/v1/my/lesson/temp-auth/status?lessonDocumentId=xxx` 返回 `{authorized:false, reason:"removed_from_activity"}`。
- 场景② 活动 `tempLessonMode` 改为 `none` → 同上返回 `removed_from_activity`。
- 场景③ 活动被删除 → `findOne` 返回 null → 返回 `removed_from_activity`。
- 场景④ 授权有 `activityDocumentId` 且活动仍开放该课时 → 返回 `{authorized:true}`。
- 场景⑤ 存量授权（无 `activityDocumentId`）→ 维持 `{authorized:true}`，不误伤。

- [ ] **Step 6: 提交（basic 仓库）**

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/dist
git commit -m "fix(activity): temp-lesson auth 增加活动归属回查，移出预解锁列表即收回"
```

> **必须一起提交 `dist`。**

---

## Task 2: temp-auth 页支持 `activityId` 预选（web · 运营端）

**Files:**
- Modify: `src/pages/activity/temp-auth.vue`

**背景**：当前页面仅 `onMounted(() => { loadActivities() })`，进入后需手动下拉选活动。列表页带 `activityId` 跳转时需自动选中该活动并加载课时。

- [ ] **Step 1: 抽出选中活动的公共逻辑 `applyActivity`**

将 `handleActivityChange`（[temp-auth.vue:150-170](file:///e:/code/web/src/pages/activity/temp-auth.vue#L150-L170)）中「选中活动」的核心逻辑抽为 `applyActivity`，让 `handleActivityChange` 与 `onLoad` 预选共用，避免重复：

```js
async function applyActivity(act) {
  if (!act) return
  currentActivityId.value = act.documentId || act.id
  currentActivityTitle.value = act.title || ''
  lessonOptions.value = []
  lessonTitles.value = []
  lessonIndex.value = -1
  lessonDocumentId.value = ''
  // 读取活动预解锁课时（临时开放模式仅绑定 1 条）
  try {
    const detail = await getActivity(currentActivityId.value)
    const lessons = normalizeLessons(detail?.preUnlockLessons)
    lessonOptions.value = lessons
    lessonTitles.value = lessons.map(l => l.title || `#${l.documentId || l.id}`)
  } catch (e) {
    lessonOptions.value = []
  }
  loadAuthList()
}

async function handleActivityChange(e) {
  await applyActivity(activities.value[Number(e.detail.value)])
}
```

- [ ] **Step 2: 引入 `onLoad` 替代 `onMounted` 初始化，支持预选**

修改 import 行（[temp-auth.vue:90](file:///e:/code/web/src/pages/activity/temp-auth.vue#L90)）：

```js
import { ref, onLoad } from 'vue'
```

> 注：`onLoad` 来自 `@dcloudio/uni-app`（`vite` 自动注入可用）。项目既有页面如 `signups.vue` 已用此模式。

将生命周期尾部（[temp-auth.vue:233-235](file:///e:/code/web/src/pages/activity/temp-auth.vue#L233-L235)）：

```js
onMounted(() => {
  loadActivities()
})
```

替换为：

```js
onLoad(async (options) => {
  await loadActivities()
  const preset = options?.activityId
  if (preset) {
    const act = activities.value.find(a => (a.documentId || a.id) === preset)
    if (act) await applyActivity(act)
    else uni.showToast({ title: '未找到该活动', icon: 'none' })
  }
})
```

- [ ] **Step 3: 自查 —— 确认无残留 `onMounted` 引用**

在文件内检索 `onMounted`，应无引用（`onLoad` 后执行）。确认 `applyActivity`、`handleActivityChange` 均在 `<script setup>` 内定义且无重名。

- [ ] **Step 4: 人工验收要点**

- 携带 `?activityId=<某活动>` 打开 `temp-auth` → 活动下拉自动回填该活动、课时列表已加载、授权记录已列出。
- 不带参数打开 → 显示占位「请选择活动」，行为与改造前一致。

- [ ] **Step 5: 提交（web 仓库）**

```bash
git add src/pages/activity/temp-auth.vue
git commit -m "feat(activity): temp-auth 支持 activityId 预选，列表入口直达"
```

---

## Task 3: 活动列表加入口「临时授权」（web · 运营端)

**Files:**
- Modify: `src/pages/activity/list.vue`

**背景**：活动操作区（现状含 到场名单/扫码核销/编辑 等，见 [list.vue:57-64](file:///e:/code/web/src/pages/activity/list.vue#L57-L64)）缺少临时授权入口。补一个按钮，跳转 `temp-auth` 并带 `activityId`。

- [ ] **Step 1: 在活动操作区插入「临时授权」按钮**

在「到场名单」按钮之后（[list.vue:60](file:///e:/code/web/src/pages/activity/list.vue#L60) 的 `<view class="action-btn" @click="goSignups(item)">到场名单</view>` 之后）插入：

```html
<view class="action-btn" @click="goTempAuth(item)">临时授权</view>
```

- [ ] **Step 2: 新增 `goTempAuth` 导航函数**

在 `goSignups` 定义之后（[list.vue:241](file:///e:/code/web/src/pages/activity/list.vue#L241) 附近）新增：

```js
const goTempAuth = (item) => {
  uni.navigateTo({ url: `/pages/activity/temp-auth?activityId=${item.documentId || item.id}` })
}
```

- [ ] **Step 3: 自查 —— 确认 `temp-auth` 路由已注册**

检索 `src/pages.json` 中 `activity/temp-auth`，确认路由存在（实现完成时已注册）。若缺失，追加：

```json
{ "path": "pages/activity/temp-auth", "style": { "navigationBarTitleText": "临时开放课时授权" } }
```

- [ ] **Step 4: 人工验收要点**

- 活动列表每张卡片操作区出现「临时授权」按钮。
- 点击进入 `temp-auth` 页，自动选中对应活动并加载课时，可继续选目标客户/到期时间提交。

- [ ] **Step 5: 提交（web 仓库）**

```bash
git add src/pages/activity/list.vue
git commit -m "feat(activity): 活动列表加入临时授权入口"
```

---

## Task 4: 部署与线上验证

部署遵循既有脚本约定（禁止裸命令行部署），三端口径同此前部署。

- [ ] **Step 1: 后端（basic 仓库）部署**

```bash
# 服务器 /www/apps/strapi 下
git pull origin main
npm run build
pm2 restart strapi
```

验证：后端健康检查返回 204；`zhao-point` 新 `dist` 已加载。

- [ ] **Step 2: 运营端（h.joho.cn）部署**

构建 web 前端并上传到 h.joho.cn（沿用既有构建上传流程），登录后硬刷新。

- [ ] **Step 3: 线上功能验证**

按 Task 1 Step 5「人工验收要点」逐场景验证，重点：
- 移出的课时不再放行（`removed_from_activity`）；
- 活动列表「临时授权」入口可直达并预选活动；
- 存量授权/正常活动不受影响。

---

## 明确不做（范围外）

- `A`：好友注册送 `invite_register` 积分。
- 不动 `grantCourseTrial` 向后兼容逻辑。
- 不引入运营移除课时→批量失效授权的事件同步机制。
- 不改动 `expiresAt` 锚定活动 endTime 的语义。