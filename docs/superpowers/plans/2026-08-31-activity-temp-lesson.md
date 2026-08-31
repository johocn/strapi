# 活动期间临时开放单课时播放权 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 活动期间对"特定客户"临时开放单个课时的播放权，活动结束自动收回；仅前端放行顺序锁，后端不增设媒体鉴权拦截。

**Architecture:** 复用 zhao-course 既有 `user-course-auth`（课程授权）模型——新增 `authType=temp_lesson` 与 activity/source 关联，把授权落到"课时所属课程"，用 `expiresAt` 锚定活动结束实现到期收回。后端在新 service 方法里做授权与判定，向 C端暴露状态接口；前端 video-player 在顺序锁判定处叠加"临时课时授权放行"，命中则不锁。三个发送来源（报名/达标/手动）统一写入 `temp_lesson` 授权记录。

**Tech Stack:** Strapi zhao-point / zhao-course 插件，uni-app shao C端，web admin。

spec 文件：`docs/superpowers/specs/2026-08-31-activity-temp-lesson-design.md`

---

## 设计决策锁定

- **授权对象**：课时所属课程（course），`authType=temp_lesson`。这样后端 `checkAuth` 对媒体播放无感知改动，前端顺序锁按"该课时是否命中有效临时授权"放行。
- **到期收回**：`expiresAt = 活动 endTime`（自动来源）或运营指定（手动来源）。判定时 `expiresAt > now` 才放行。
- **三类来源对应**：`source: signup | milestone | manual`。
- **幂等**：`(user, course, activity, source)` 唯一，重复发送不再新建。
- **前端放行点**：video-player `getLessonLockStatus()` 前，先判定 `isTempAuthorized(lesson.documentId)`，为真则返回 `{locked:false}`，绕过 handleLessonClick/selectLesson 的顺序锁拦截。
- **后端不拦**：zhao-course `checkAuth` / `api-controller`（stream-token）保持现状。

---

### Task 1: 扩展课程授权模型（zhao-course user-course-auth）

**Files:**
- Modify: `plugins/zhao-course/server/src/content-types/user-course-auth/schema.json`

- [ ] **Step 1: schema 增加 temp_lesson 授权能力**

修改 `schema.json`，把 `authType` enum 增加 `"temp_lesson"`，并新增 `activityDocumentId`（string）、`lessonDocumentId`（string）、`source`、`grantedAt` 四字段。**用 string 字段而非跨插件 relation**（`activity` 属 zhao-point 插件，跨插件 relation 在实务解析成本高、易失效；string 记录 documentId 足够判定且无耦合）：

```json
{
  "kind": "collectionType",
  "collectionName": "zhao_user_course_auths",
  "info": { "singularName": "user-course-auth", "pluralName": "user-course-auths", "displayName": "用户课程授权" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" },
    "course": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-course.course" },
    "activityDocumentId": { "type": "string" },
    "lessonDocumentId": { "type": "string" },
    "authType": { "type": "enumeration", "enum": ["free", "paid", "admin_grant", "temp_lesson"], "default": "free" },
    "source": { "type": "enumeration", "enum": ["signup", "milestone", "manual"], "default": "manual" },
    "grantedAt": { "type": "datetime" },
    "expiresAt": { "type": "datetime" },
    "isExpired": { "type": "boolean", "default": false },
    "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" },
    "deletedAt": { "type": "datetime", "default": null }
  }
}
```

- [ ] **Step 2: 校验 schema**

Run: `cd e:\code\basic && npm run build`（触发插件编译）
Expected: 无 schema 解析错误，`zhao_user_course_auths` 可加载。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-course/server/src/content-types/user-course-auth/schema.json
git commit -m "feat(course-auth): 扩展 temp_lesson 授权模型，关联 activity/lesson/source"
```

---

### Task 1A: 活动内容类型增加临时开放模式字段

**Files:**
- Modify: `plugins/zhao-point/server/src/content-types/activity/schema.json`

- [ ] **Step 1: 增加 tempLessonMode 字段**

在 `schema.json` 的 `attributes` 中，`preUnlockLessons`（L38）之后新增：

```json
"tempLessonMode": { "type": "enumeration", "enum": ["none", "signup", "milestone", "manual", "mixed"], "default": "none" },
```

- [ ] **Step 2: 校验并提交**

Run: `cd e:\code\basic && npm run build`（期望无 schema 解析错误）

```bash
git add plugins/zhao-point/server/src/content-types/activity/schema.json
git commit -m "feat(activity): 活动内容类型增加 tempLessonMode 临时开放模式字段"
```

---

### Task 2: zhao-point 新增临时课时授权 service 方法

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: 辅助函数**

在模块级 `grantCourseTrial`（L279）之后新增一个 `grantTempLessonLesson` 辅助函数（按课时授权到课程，记录 lessonDocumentId 供前端判定放行）：

```ts
/** 按课时写入 temp_lesson 授权（幂等 per user+course+activityDocumentId+lessonDocumentId+source） */
async function grantTempLessonLesson(strapi: any, opts: {
  userId: number; courseId: number;
  activityDocumentId: string; lessonDocumentId: string;
  source: "signup" | "milestone" | "manual";
  expiresAt?: string | Date | null;
}) {
  try {
    const expires = opts.expiresAt ? new Date(opts.expiresAt) : null;
    const existing = await strapi.db.query(AUTH_UID).findOne({
      where: {
        user: opts.userId, course: opts.courseId,
        authType: "temp_lesson", lessonDocumentId: opts.lessonDocumentId,
      },
    });
    if (existing) {
      // 幂等：仅当新授权到期更晚时延后
      if (expires && (!existing.expiresAt || new Date(existing.expiresAt) < expires)) {
        await strapi.db.query(AUTH_UID).update({
          where: { id: existing.id },
          data: { expiresAt: expires, isExpired: false },
        });
      }
      return existing;
    }
    await strapi.db.query(AUTH_UID).create({
      data: {
        user: opts.userId, course: opts.courseId,
        activityDocumentId: opts.activityDocumentId,
        lessonDocumentId: opts.lessonDocumentId,
        authType: "temp_lesson", source: opts.source,
        expiresAt: expires, grantedAt: new Date(),
        isExpired: false,
      },
    });
  } catch { /* 幂等授权，失败忽略 */ }
}
```

- [ ] **Step 2: 新增判定方法 `isLessonTempAuthorized`**

加在 service 返回对象内（`getLearningContent` 之前）。判定只看授权有效性（存在未过期匹配的 temp_lesson 授权即放行），不反向查活动表：

```ts
/** 单课时临时授权判定：用户对该课时存在未过期 temp_lesson 授权 → 放行（活动期与否在发送时已约束） */
async isLessonTempAuthorized({ userId, lessonDocumentId }: { userId: number; lessonDocumentId: string }) {
  const auth = await strapi.db.query(AUTH_UID).findOne({
    where: {
      user: userId, authType: "temp_lesson", lessonDocumentId,
      isExpired: false,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date().toISOString() } }],
    },
  });
  if (!auth) return { authorized: false, reason: "no_auth" };
  return { authorized: true, auth };
}
```

**补强说明（供执行时落地，勿遗漏）**：`userId` 需与 `getLearningContent` 一致（up_user id）。判定核心是"存在未过期 `lessonDocumentId` 匹配的 temp_lesson 授权"即放行。`grantTempLessonLesson` 落库时写入 `lessonDocumentId`，正是供此判定匹配使用。

- [ ] **Step 3: 暴露判定方法到 service 返回**

确保 activity service 返回对象内 `isLessonTempAuthorized` 可被 controller 调用（因 object 方法，`return ({ ..., isLessonTempAuthorized })` 中已含）。

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(activity): 临时课时授权发送与判定 service"
```

---

### Task 3: zhao-point controller 新增临时授权状态接口

**Files:**
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts`
- Modify: `plugins/zhao-point/server/src/routes/content-api.ts`

- [ ] **Step 1: controller 加 `tempLessonAuthStatus`**

在 `learningContent` 方法后新增：

```ts
// GET /my/lesson/temp-auth/status?lessonDocumentId=...
async tempLessonAuthStatus(ctx: any) {
  try {
    const userId = await getUserId(ctx);
    const { lessonDocumentId } = ctx.query;
    if (!lessonDocumentId) { ctx.status = 400; ctx.body = { error: "缺少 lessonDocumentId" }; return; }
    const result = await activitySvc().isLessonTempAuthorized({ userId, lessonDocumentId });
    ctx.body = wrap(result);
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},
```

- [ ] **Step 2: controller 加 `grantTempLessonAuth`（运营手动授权）**

在 `tempLessonAuthStatus` 后新增：

```ts
// POST /adm/lessons/temp-auth  运营手动授权（body:{activityId,userId,lessonDocumentId,expiresAt}）
async adminGrantTempLessonAuth(ctx: any) {
  try {
    const { activityId, userId, lessonDocumentId, expiresAt, source = "manual" } = ctx.request.body?.data || ctx.request.body || {};
    if (!activityId || !userId || !lessonDocumentId) {
      ctx.status = 400; ctx.body = { error: "缺少 activityId/userId/lessonDocumentId" }; return;
    }
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId, populate: { preUnlockLessons: { select: ["documentId", "course"] } } });
    if (!act) { ctx.status = 404; ctx.body = { error: "活动不存在" }; return; }
    const lesson = act.preUnlockLessons?.find((l: any) => l.documentId === lessonDocumentId || l.id === lessonDocumentId);
    if (!lesson) { ctx.status = 400; ctx.body = { error: "该课时不在活动的临时开放列表" }; return; }
    const exp = expiresAt || act.endTime || null;
    // 复用幂等发送 helper（避免重复 create）
    await grantTempLessonLesson(strapi, {
      userId: Number(userId),
      courseId: Number(lesson.course?.id) || Number(lesson.course),
      activityDocumentId: activityId,
      lessonDocumentId,
      source: source as any,
      expiresAt: exp,
    });
    ctx.body = wrap({ ok: true, expiresAt: exp });
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},
```

（注：`lesson.course` 可能为对象或 id，`lesson.course?.id || lesson.course` 兼容两种形态。`grantTempLessonLesson` 须为模块级函数，controller 内可访问。）

- [ ] **Step 3: 路由注册**

在 `content-api.ts` 用户路由段（紧跟 `learning` 后）加：

```ts
userRoute("GET", "/my/lesson/temp-auth/status", "activity.tempLessonAuthStatus"),
```

管理员段新增：

```ts
channelScopeRoute("GET", "/adm/lessons/temp-auth/list", "activity.adminListTempAuth", "activity.read"),
channelScopeRoute("POST", "/adm/lessons/temp-auth", "activity.adminGrantTempLessonAuth", "activity.update"),
```

（`adminListTempAuth` 在 Task 4 补 controller 方法。）

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/server/src/routes/content-api.ts
git commit -m "feat(activity): 临时课时授权状态查询与运营手动授权接口"
```

---

### Task 4: zhao-point 报名发送临时授权

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`（`signup` 方法）

- [ ] **Step 1: 报名后写 temp_lesson 授权**

在 `signup` 方法的"预留存：试看课时所属课程授权"循环（当前 L622-625）处，改为按临时课时语义发送（保留原 `grantCourseTrial` 为向后兼容，但优先写 temp_lesson）：

```ts
// 预留存：试看课时所属课程授权（临时课时→temp_lesson，带活动到期）
const tempExpiry = act.endTime || null;
for (const lesson of act.preUnlockLessons || []) {
  if (!lesson?.course?.id) continue;
  await grantCourseTrial(strapi, userId, lesson.course.id); // 向后兼容
  await grantTempLessonLesson(strapi, {
    userId,
    courseId: lesson.course.id,
    activityDocumentId: act.documentId,
    lessonDocumentId: lesson.documentId || String(lesson.id),
    source: "signup",
    expiresAt: tempExpiry,
  });
}
```

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(activity): 报名即发送临时课时授权（锚定活动结束）"
```

---

### Task 5: 达标（milestone）发送临时授权

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`（`recomputeUnlock` 区域 / 达标判定触发点）

- [ ] **Step 1: 在达标重算通过后补发 temp_lesson**

定位 `recomputeUnlock`（L125 附近）——它在本轮达成新条件后 `newlyGranted` 返回。在其完成、且活动处于临时开放模式时，补充发送临时授权：

```ts
// 达标达成发送临时课时授权（source=milestone）
const tempLessons = act.preUnlockLessons || [];
if (tempLessons.length) {
  for (const lesson of tempLessons) {
    if (!lesson?.course?.id) continue;
    await grantTempLessonLesson(strapi, {
      userId, courseId: lesson.course.id,
      activityDocumentId: act.documentId,
      lessonDocumentId: lesson.documentId || String(lesson.id),
      source: "milestone",
      expiresAt: act.endTime || null,
    });
  }
}
```

（建议把该段放入 `recomputeUnlock` 计算出 `newlyGranted` 之后；若 `recomputeUnlock` 非 object 方法无法调 helper，则把 helper `grantTempLessonLesson` 定义为模块级函数（已在 Task 2 定义为模块级），此处直接可调用。）

- [ ] **Step 2: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(activity): 达标达成发送临时课时授权"
```

---

### Task 6: C端前端——video-player 顺序锁放行临时课时

**Files:**
- Modify: `e:\code\shao\pages\video-player\video-player.vue`

- [ ] **Step 1: 数据与请求**

在 `<script setup>` 新增临时授权查询函数（复用现有 `request`/api 封装，例如 `api.ts` 加 `getTempLessonAuthStatus`）：

```ts
import { getTempLessonAuthStatus } from '../../services/api'

const tempAuthorized = ref<Set<string>>(new Set())

async function loadTempAuth() {
  try {
    const docIds = lessons.value.map((l: any) => l.documentId)
    for (const did of docIds) {
      if (!did) continue
      const res: any = await getTempLessonAuthStatus(did)
      if (res?.data?.authorized) tempAuthorized.value.add(did)
    }
  } catch (e) { /* 静默：无临时授权按正常锁定 */ }
}

function isTempAuthorized(lesson: any): boolean {
  return lesson ? tempAuthorized.value.has(lesson.documentId) : false
}
```

在 `loadData()` 中 `lessons.value = enrichLessons(...)` 之后调用 `loadTempAuth()`（非阻塞）。

- [ ] **Step 2: 在顺序锁判定处叠加放行**

修改 `getLessonLockStatus`：开头若临时授权命中直接返回未锁：

```ts
function getLessonLockStatus(lesson: any) {
  if (isTempAuthorized(lesson)) {
    return { locked: false, enforceMode: false, reason: '', firstIncomplete: null }
  }
  if (!lesson?.sequenceTag || (lesson.sequenceNumber ?? 0) === 0) {
    return { locked: false, enforceMode: false, reason: '', firstIncomplete: null }
  }
  // ... 原有 checkItemLock 逻辑不变
}
```

这样 `handleLessonClick`（L612-621）与 `selectLesson`（L678-688）的顺序锁拦截自然被绕过。

- [ ] **Step 3: `api.ts` 新增接口**

在 `e:\code\shao\services\api.ts` 增加：

```ts
export async function getTempLessonAuthStatus(lessonDocumentId: string) {
  return request(`/zhao-point/v1/my/lesson/temp-auth/status?lessonDocumentId=${encodeURIComponent(lessonDocumentId)}`, { method: 'GET' })
}
```

- [ ] **Step 4: 提交（shao 仓库）**

```bash
git add pages/video-player/video-player.vue services/api.ts
git commit -m "feat(h5): 活动临时课时在顺序锁判定中放行"
```

---

### Task 7: 运营端 admin——手动授权与列表（web/src）

**Files:**
- Modify: `e:\code\web\src\pages\activity\form.vue`（装配 tempLessonMode，约束 preUnlockLessons 为 1 个临时课时）
- Modify: `e:\code\web\src\api\activity.js`（新增接口）
- Create: 手动授权页（入口在活动 signups 下）

- [ ] **Step 1: activity form 增加 tempLessonMode 选择**

在 `form.vue` 的"解锁课时"区块上方新增枚举选择（none/signup/milestone/manual/mixed），并把 `preUnlockLessons` 在 mixed/manual 模式下约束最多 1 条（在 `openRelPicker('preUnlockLessons')` 时提示"临时开放模式仅可选 1 课时"）。提交 `tempLessonMode` 字段到后端。

- [ ] **Step 2: `api\activity.js` 增加手动授权接口**

```js
export function grantTempLessonAuth(payload) {
  return request.post('/zhao-point/v1/admin/lessons/temp-auth', payload)
}
export function listTempAuth(params) {
  return request.get('/zhao-point/v1/admin/lessons/temp-auth/list', { params })
}
```

- [ ] **Step 3: 提交（web 仓库）**

```bash
git add src/pages/activity/form.vue src/api/activity.js
git commit -m "feat(admin): 活动临时课时模式配置与手动授权接口"
```

---

### Task 8: 运营端手动授权 UI + 列表 controller 补齐

**Files:**
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts`（补 `adminListTempAuth`）
- Create/Modify: `e:\code\web\src\pages\activity\temp-auth.vue`（手动授权页）

- [ ] **Step 1: controller `adminListTempAuth`**

在 `adminGrantTempLessonAuth` 后补：

```ts
// GET /adm/lessons/temp-auth/list?activityDocumentId=  （按活动列出已授权）
async adminListTempAuth(ctx: any) {
  try {
    const { activityDocumentId } = ctx.query;
    const where: any = { authType: "temp_lesson" };
    if (activityDocumentId) where.activityDocumentId = activityDocumentId;
    const AUTH_UID = "plugin::zhao-course.user-course-auth";
    const rows = await strapi.db.query(AUTH_UID).findMany({
      where,
      populate: { user: { select: ["id", "username"] }, course: { select: ["documentId", "title"] }, lesson: { select: ["documentId", "title"] } },
      orderBy: { grantedAt: "desc" },
    });
    ctx.body = wrapList(rows.map((r: any) => ({
      id: r.id,
      user: r.user ? { id: r.user.id, username: r.user.username } : null,
      course: r.course ? { documentId: r.course.documentId, title: r.course.title } : null,
      lesson: r.lesson ? { documentId: r.lesson.documentId, title: r.lesson.title } : null,
      activityDocumentId: r.activityDocumentId,
      source: r.source, expiresAt: r.expiresAt, grantedAt: r.grantedAt, isExpired: r.isExpired,
    })));
  } catch (e: any) {
    ctx.status = (e as any).status || 400;
    ctx.body = { error: e.message };
  }
},
```

- [ ] **Step 2: 提交（basic）**

```bash
git add plugins/zhao-point/server/src/controllers/activity.ts
git commit -m "feat(activity): 运营手动授权列表接口"
```

- [ ] **Step 3: temp-auth.vue 手动授权页**

页面包含：选择活动（带入 preUnlockLessons 列表）→ 选 1 课时 → 输客户（用户名/ID）→ 选到期（默认活动结束）→ 提交 `grantTempLessonAuth`；下方表格展示 `listTempAuth` 结果与到期时间。

（因涉及 page.json 路由注册与既有导航结构，执行时节选，按现有 `activity/signups.vue` 页面骨架实现。）

- [ ] **Step 4: 提交（web）**

```bash
git add src/pages/activity/temp-auth.vue src/pages.json
git commit -m "feat(admin): 活动临时课时手动授权页"
```

---

### Task 9: 部署与验证

**Files:** 服务器端 `docs/deployment/deploy.sh`（若需后端）；前端 `deploy-h5.ps1`。

- [ ] **Step 1: 后端部署**

```bash
# 本地 basic 提交后
# 服务器：
cd /www/apps/strapi && git pull origin main && npm run build && pm2 restart strapi
```

- [ ] **Step 2: 健康检查**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:1337/_health`（期望 204）

- [ ] **Step 3: 后端验证用例**

1. 新建临时开放活动（tempLessonMode=signup）绑 1 课时，endTime 明日。
2. 用测试客户报名，随后 `GET /my/lesson/temp-auth/status?lessonDocumentId=X` 应 `authorized:true`，且 auth.expiresAt 等于活动 endTime。
3. 手动授权：`POST /adm/lessons/temp-auth`（用户 B、课时 X、expiresAt 设为已过期），状态接口对用户 B 返回 `authorized:false`。
4. 把活动 endTime 改成过去，auto 授权判定应为 false（已过期收回）。

- [ ] **Step 4: 前端部署**

```powershell
# 本地 build:h5 后
powershell -File e:\code\shao\deploy-h5.ps1  # 校验 SYNC_OK
```

- [ ] **Step 5: 前端验证**

v.joho.cn 硬刷新后：报名临时开放活动的客户进入该课程，被顺序锁锁定的临时课时可播放；未授权客户点击弹顺序锁；授权过期客户恢复锁定。

---

## Self-Review 检查

- **Spec 覆盖**：三类来源——signup（Task 4）、milestone（Task 5）、manual（Task 3/8）✓；到期收回（expiresAt 校验 Task 2 + 过期场景 Task 9）✓；前端放行顺序锁（Task 6）✓；后端不设媒体拦截（未改 checkAuth/api-controller）✓；每活动仅 1 课时（admin form 约束 Task 7）✓；tempLessonMode 字段（Task 1A）✓。
- **占位/死代码扫描**：无 TBD；`NODE_TEMP_UID` 死常量已删（Task 2 Step 1 仅保留一个后置 helper）；Task 3 Step2 的注释占位与重复 create 已改为复用 `grantTempLessonLesson`（幂等）✓。
- **类型一致性**：`grantTempLessonLesson(strapi, { userId, courseId, activityDocumentId, source, expiresAt })` 在 Task 2 定义（模块级）、Task 3/4/5 复用，签名一致 ✓（Task 3 另带 `lessonDocumentId`，与 Task 2 create 所需一致）。controller 用 `getUserId`、`activitySvc()`、`wrap`、`wrapList`、`grantTempLessonLesson`（模块级）均为既有/已定义 ✓。