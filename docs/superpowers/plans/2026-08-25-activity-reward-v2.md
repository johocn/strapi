# 活动奖励权益 v2（递进式领取）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将线下活动奖励从「多选解锁通道 + 分叉领权益」重构为「单选通道门槛 + 递进式领取」模型，新增关注公众号条件与独立问卷表单。

**Architecture:** 后端 `zhao-point` 插件在报名判定中引入 `channel`（四选一通道门槛）、`conditions`（contact/survey 数据条件）与 `subscribed`（复用 zhao-sso 关注状态）三层判定；新增 `questionnaire` 活动级配置与 `questionnaireData` 报名级存储；新增补填问卷与解锁状态查询接口。web 管理端拆出 `activity-reward-config.vue`、`activity-questionnaire.vue` 两组件。C 端（shao）按 `channelDone && condition` 展示可领权益，未满足条件展示「去达成」引导，按 selectMode 约束勾选。

**Tech Stack:** Strapi 5 插件（zhao-point / zhao-sso）、uni-app（web 运营端 / shao C 端）、PostgreSQL、Node 验收脚本。

**Spec:** `docs/superpowers/specs/2026-08-24-activity-reward-v2-design.md`

---

## 文件结构

**后端（zhao-point 插件，`e:\code\basic\plugins\zhao-point\server\src`）**
- Modify `content-types/activity/schema.json` — 新增 `questionnaire` JSON 字段
- Modify `content-types/activity-signup/schema.json` — 新增 `questionnaireData` JSON 字段
- Modify `services/form.ts` — 新增 `collectQuestionnaire`（问卷字段宽松收集 + 值校验）
- Modify `services/activity.ts` — 新增 helpers（`resolveChannel`/`hasSubscribe`/`contactFilled`/`surveyFilled`/`channelDoneOf`/`recomputeUnlock`），重构 `signup()` 判定，新增 `fillQuestionnaire()`/`unlockCheck()`
- Modify `controllers/activity.ts` — 新增 `questionnaire`、`unlockCheck` 两个 action
- Modify `routes/content-api.ts` — 注册两条 userRoute

**web 管理端（`e:\code\web\src`）**
- Create `components/activity-reward-config.vue` — 奖励配置组件（通道单选/选择方式/奖励编辑器）
- Create `components/activity-questionnaire.vue` — 问卷配置组件（启用/标题/字段编辑器/模板）
- Modify `pages/activity/form.vue` — 挂载两组件、聚合提交

**C 端（`e:\code\shao`）**
- Modify `services/api.ts` — `signupActivity` 增 `questionnaireData`；新增 `fillQuestionnaire`、`unlockCheck`
- Modify `pages/activity/detail.vue` — 递进式引导流程

**验收**
- Create `scripts/accept-activity-reward-v2.cjs`

---

## 后端

### Task 1: content-type 新增字段

**Files:**
- Modify: `plugins/zhao-point/server/src/content-types/activity/schema.json:42`（rewardConfig 后）
- Modify: `plugins/zhao-point/server/src/content-types/activity-signup/schema.json:19`（unlockInfo 后）

- [ ] **Step 1: activity schema 新增 questionnaire**

在 `activity/schema.json` 的 `rewardConfig` 属性后新增：

```json
"questionnaire": { "type": "json" }
```

- [ ] **Step 2: activity-signup schema 新增 questionnaireData**

在 `activity-signup/schema.json` 的 `unlockInfo` 后新增：

```json
"questionnaireData": { "type": "json" }
```

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/server/src/content-types/activity-signup/schema.json
git commit -m "feat(zhao-point): activity/questionnaire 与 signup/questionnaireData 字段"
```

---

### Task 2: form.ts 新增问卷收集

**Files:**
- Modify: `plugins/zhao-point/server/src/services/form.ts`

- [ ] **Step 1: 新增 collectQuestionnaire**

在 `collectFormData` 之后新增（宽松收集：空值忽略、按字段类型规范化，并对 radio/select/multi 做选项校验，非法值丢弃）：

```typescript
/** 问卷字段宽松收集：空值忽略；radio/select/multi 校验选项，非法值丢弃；number 规范化 */
export function collectQuestionnaire(fields: any, data: any): Record<string, any> {
  const fArr = Array.isArray(fields) ? fields : [];
  const d = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const out: Record<string, any> = {};
  for (const f of fArr) {
    if (!f || typeof f !== "object" || !f.key) continue;
    const raw = d[f.key];
    if (isEmpty(raw)) continue;
    if (f.type === "number") {
      const n = Number(raw);
      out[f.key] = Number.isFinite(n) ? n : raw;
    } else if (f.type === "multi") {
      if (!isPlainArray(raw)) continue;
      const opts = normalizeOptions(f);
      out[f.key] = raw.map((x: any) => String(x)).filter((x: string) => opts.includes(x));
    } else if (f.type === "radio" || f.type === "select") {
      if (!normalizeOptions(f).includes(String(raw))) continue;
      out[f.key] = String(raw);
    } else {
      out[f.key] = String(raw);
    }
  }
  return out;
}
```

- [ ] **Step 2: 导出 collectQuestionnaire**

在文件底部 `export default` 对象的工具方法里追加 `collectQuestionnaire`。

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-point/server/src/services/form.ts
git commit -m "feat(zhao-point): questionnaire 字段宽松收集 collectQuestionnaire"
```

---

### Task 3: activity.ts 判定逻辑重构（signup）

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: 顶部导入 collectQuestionnaire**

```typescript
import { FormValidationError, validateFormData, collectFormData, collectQuestionnaire, channelFilled } from "./form";
```

- [ ] **Step 2: 新增通道/条件 helpers（放在 resolveCondition 之后）**

```typescript
/** 归一化解锁通道：channel.type 优先；兼容旧 infoChannels（取首个映射，仅 contact/survey 直映，其余默认 contact） */
function resolveChannel(rewardConfig: any): { type: string; label?: string } {
  const rc = rewardConfig && typeof rewardConfig === "object" ? rewardConfig : {};
  if (rc.channel?.type) return rc.channel;
  const legacy = Array.isArray(rc.infoChannels) ? rc.infoChannels.find((c: any) => c?.channel) : undefined;
  if (legacy?.channel === "survey") return { type: "survey", label: "回答调查问卷" };
  if (legacy?.channel === "contact") return { type: "contact", label: "留联系方式" };
  return { type: "contact", label: "留联系方式" }; // 无配置/wechat_auth/subscribe 兜底 contact
}

/** 是否已关注公众号：resolve sso → refreshSubscribe 刷新（失败静默降级绑定表缓存值） */
async function hasSubscribe(strapi: any, upUserId: number): Promise<boolean> {
  try {
    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
    if (!sop || !msg) return false;
    const sso = await sop.resolveSsoUserForUpUser(upUserId);
    if (!sso?.id) return false;
    try {
      const fresh = await msg.refreshSubscribe(sso.id, "official_account");
      if (typeof fresh === "number") return fresh === 1;
    } catch { /* 刷新失败降级缓存值 */ }
    const binding = await strapi.db.query("plugin::zhao-sso.sso-third-party-binding").findOne({
      where: { user: sso.id, provider: "wechat" },
      orderBy: { id: "DESC" },
    });
    return (binding?.subscribe ?? 0) === 1;
  } catch {
    return false;
  }
}

/** contact 条件：报名表单存在 type=phone 字段且表单已填非空电话 */
function contactFilled(formConfig: any, formData: any): boolean {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" ? formData : {};
  return fields.some((f: any) => f?.type === "phone" && f?.key && !isEmpty(data[f.key]));
}

/** survey 条件：questionnaireData 至少一个字段有值 */
function surveyFilled(questionnaireData: any): boolean {
  if (!questionnaireData || typeof questionnaireData !== "object" || Array.isArray(questionnaireData)) return false;
  return Object.keys(questionnaireData).some((k) => {
    const v = questionnaireData[k];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== "";
  });
}

/** channelDone：单选通道门槛是否达成（无通道视为恒真） */
function channelDoneOf(channelType: string, conditions: Record<string, boolean>, loginAuth: boolean, subscribed: boolean): boolean {
  if (!channelType) return true;
  switch (channelType) {
    case "contact": return conditions.contact;
    case "survey": return conditions.survey;
    case "wechat_auth": return loginAuth;
    case "subscribe": return subscribed;
    default: return true;
  }
}
```

`isEmpty` 为 file 内已有函数，无需新增。

- [ ] **Step 3: 更新 isRewardUnlocked 支持 subscribe**

```typescript
/** 奖励解锁判定：none=过通道即领；wechat_auth=loginAuth；subscribe=subscribed；contact/survey=对应条件已达成 */
function isRewardUnlocked(r: any, loginAuth: boolean, subscribed: boolean, conditions: Record<string, boolean>): boolean {
  if (!r || typeof r !== "object") return false;
  const c = resolveCondition(r);
  if (c === "wechat_auth") return loginAuth;
  if (c === "subscribe") return subscribed;
  if (c === "contact" || c === "survey") return !!conditions[c];
  return true; // none / 未识别视为无条件（仍须过通道门槛）
}
```

- [ ] **Step 4: 重构 signup() 解锁判定块**

将原「解锁判定：Group1 授权登录 + Group2 信息通道」整块（当前第 233-253 行 `let loginAuth ... chosenRewardsIds`）替换为：

```typescript
    // 递进式判定：通道门槛(channelDone) + 各权益独立 condition
    let loginAuth = false;
    let subscribed = false;
    const conditions: Record<string, boolean> = { contact: false, survey: false };
    let channelType: string | undefined;
    let rewardList: any[] = [];
    if (hasReward) {
      loginAuth = await hasWechatAuth(strapi, userId);
      subscribed = await hasSubscribe(strapi, userId); // 非关键路径，失败静默 false
      channelType = resolveChannel(rewardConfig)?.type;
      conditions.contact = contactFilled(formConfig, formData);
      conditions.survey = surveyFilled(questionnaireData);
      rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
    }
    const channelDone = channelDoneOf(channelType, conditions, loginAuth, subscribed);
    const visibleRewards = rewardList.filter((r: any) => channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions));
    const autoChosen = visibleRewards.filter((r: any) => r.mode !== "multi").map((r: any) => r.id);
    const multiIds = visibleRewards.filter((r: any) => r.mode === "multi").map((r: any) => r.id);
    // selectMode 约束（multi 权益）：all 全选 / one 最多1 / any 最多 selectN(默认1)
    const selectMode = rewardConfig?.selectMode || "all";
    const selectN = Math.max(1, Number(rewardConfig?.selectN) || 1);
    let multiSelected = (Array.isArray(chosenRewards) ? chosenRewards : []).filter((id: any) => multiIds.indexOf(id) >= 0);
    if (selectMode === "all") multiSelected = multiIds;
    else if (selectMode === "one") multiSelected = multiSelected.slice(0, 1);
    else if (selectMode === "any") multiSelected = multiSelected.slice(0, selectN);
    const chosenRewardsIds = [...autoChosen, ...multiSelected];
    const unlockInfo = hasReward ? { loginAuth, subscribed, channelDone, conditions, chosenRewards: chosenRewardsIds } : undefined;
```

- [ ] **Step 5: 更新 signup 签名与入参**

签名由 `signup({ userId, activityId, formData, chosenRewards })` 改为 `signup({ userId, activityId, formData, questionnaireData, chosenRewards })`。

- [ ] **Step 6: 报名 create 时存 questionnaireData，并捕获 signupId 返回**

- waiting 分支（当前第 262-263 行 create 返回赋值给 `sig`）：在 data 中追加 `...(questionnaireData && Object.keys(questionnaireData).length ? { questionnaireData } : {})`；返回 `{ ok: true, waitlisted: true, position: waitCount + 1, signupId: sig.id }`。
- active 分支（当前第 314 行 create 未捕获返回值）：改为 `const sig = await strapi.db.query(SIGNS_UID).create({ data: { ...(questionnaireData && Object.keys(questionnaireData).length ? { questionnaireData } : {}) } })`，并在两处 return（第 344、364 行）追加 `signupId: sig.id`。

- [ ] **Step 7: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): 活动奖励 v2 递进式判定（通道门槛/关注条件/selectMode）"
```

---

### Task 4: 新增 fillQuestionnaire 与 unlockCheck

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts`

- [ ] **Step 1: 新增共享重算 helper（模块级函数，放在 hasSubscribe 之后）**

```typescript
/** 重算 unlockInfo 并幂等发放新增解锁的 multi 权益；供补填问卷/解锁刷新共用 */
async function recomputeUnlock(strapi: any, signup: any, act: any): Promise<{ unlockInfo: any; newlyGranted: any[] }> {
  const userId = signup.user?.id ?? signup.user;
  const rewardConfig = act.rewardConfig;
  if (!rewardConfig || typeof rewardConfig !== "object") return { unlockInfo: undefined, newlyGranted: [] };
  const prevChosen = Array.isArray(signup.unlockInfo?.chosenRewards) ? signup.unlockInfo.chosenRewards : [];
  const loginAuth = await hasWechatAuth(strapi, userId);
  const subscribed = await hasSubscribe(strapi, userId);
  const channelType = resolveChannel(rewardConfig)?.type;
  const conditions = {
    contact: contactFilled(act.formConfig, signup.formData),
    survey: surveyFilled(signup.questionnaireData),
  };
  const channelDone = channelDoneOf(channelType, conditions, loginAuth, subscribed);
  const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
  const newly = rewardList.filter((r: any) =>
    r?.mode === "multi" && channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions) && prevChosen.indexOf(r.id) < 0
  );
  const granted: any[] = [];
  if (newly.length) {
    const channelId = await resolveUserChannelId(strapi, userId);
    for (const r of newly) {
      const g = await grantReward(strapi, { userId, reward: r, channelId });
      if (g) granted.push(g);
    }
  }
  const unlockInfo = {
    loginAuth, subscribed, channelDone, conditions,
    chosenRewards: [...prevChosen, ...granted.map((g) => g.id)],
  };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { unlockInfo } });
  return { unlockInfo, newlyGranted: granted };
}
```

- [ ] **Step 2: 新增 fillQuestionnaire 方法（挂到 service 对象）**

```typescript
  /** 补填问卷：更新 questionnaireData → 重算解锁 → 幂等发放新增解锁的 multi 权益 */
  async fillQuestionnaire({ userId, signupId, answers }: { userId: number; signupId: number; answers?: any }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { id: signupId, user: userId } });
    if (!signup) throw new Error("报名记录不存在");
    if (signup.status !== "active" && signup.status !== "waiting") throw new Error("报名已失效");
    const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: signup.activity } });
    if (!act) throw new Error("活动不存在");
    const q = act.questionnaire;
    if (!q || q.enabled !== true || !Array.isArray(q.fields) || !q.fields.length) throw new Error("该活动未开启问卷");
    const collected = collectQuestionnaire(q.fields, answers);
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { questionnaireData: collected } });
    const { unlockInfo, newlyGranted } = await recomputeUnlock(strapi, signup, act);
    return { ok: true, unlockInfo, newlyUnlocked: newlyGranted };
  },
```

- [ ] **Step 3: 新增 unlockCheck 方法（C 端引导前/关注后实时刷新用）**

```typescript
  /** 解锁状态探测：C 端报名前或关注/授权后调用，返回通道/条件/可领权益（不入库） */
  async unlockCheck({ userId, activityDocumentId, formData, questionnaireData }: {
    userId: number; activityDocumentId: string; formData?: any; questionnaireData?: any;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const rewardConfig = act.rewardConfig;
    if (!rewardConfig || typeof rewardConfig !== "object") return { ok: true, hasReward: false };
    const loginAuth = await hasWechatAuth(strapi, userId);
    const subscribed = await hasSubscribe(strapi, userId);
    const ch = resolveChannel(rewardConfig);
    const conditions = {
      contact: contactFilled(act.formConfig, formData),
      survey: surveyFilled(questionnaireData),
    };
    const channelDone = channelDoneOf(ch?.type, conditions, loginAuth, subscribed);
    const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
    return {
      ok: true,
      hasReward: true,
      loginAuth,
      subscribed,
      channel: ch,
      conditions,
      channelDone,
      selectMode: rewardConfig.selectMode || "all",
      selectN: Math.max(1, Number(rewardConfig.selectN) || 1),
      rewards: rewardList.map((r: any) => ({
        id: r.id, name: r.name, type: r.type, mode: r.mode,
        condition: resolveCondition(r),
        unlocked: !!r?.id && channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions),
      })),
    };
  },
```

- [ ] **Step 4: 提交**

```bash
git add plugins/zhao-point/server/src/services/activity.ts
git commit -m "feat(zhao-point): 活动奖励 v2 补填问卷与解锁状态接口服务"
```

---

### Task 5: controller + routes 注册

**Files:**
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts`
- Modify: `plugins/zhao-point/server/src/routes/content-api.ts`

- [ ] **Step 1: controller 新增 questionnaire action**

在 `signup` action（当前第 118-135 行）之后新增：

```typescript
  // PUT /my/activity/signup/:signupId/questionnaire  补填问卷（解锁 survey 条件后可二次领取）
  async questionnaire(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const signupId = parseInt(ctx.params.signupId, 10);
      const { answers } = ctx.request.body || {};
      const result = await activitySvc().fillQuestionnaire({ userId, signupId, answers });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  // POST /my/activity/:documentId/unlock-check  解锁状态探测（报名前/关注后刷新）
  async unlockCheck(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { formData, questionnaireData } = ctx.request.body || {};
      const result = await activitySvc().unlockCheck({
        userId, activityDocumentId: ctx.params.documentId, formData, questionnaireData,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
```

- [ ] **Step 2: routes 注册两条 userRoute**

在 `content-api.ts` 当前第 154-158 行注册用户路由区追加：

```typescript
    userRoute("POST", "/my/activity/:documentId/unlock-check", "activity.unlockCheck"),
    userRoute("PUT", "/my/activity/signup/:signupId/questionnaire", "activity.questionnaire"),
```

（放在 `userRoute("POST", "/my/activity/signup", "activity.signup")` 之后，避免与 `:documentId` 通配冲突。）

- [ ] **Step 3: 提交**

```bash
git add plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/server/src/routes/content-api.ts
git commit -m "feat(zhao-point): 活动奖励 v2 补填问卷/解锁探测 controller 与路由"
```

---

### Task 6: 重建插件 dist + 冒烟

**Files:**
- Build: `plugins/zhao-point` dist

- [ ] **Step 1: 重建 zhao-point dist**

```bash
cd e:/code/basic/plugins/zhao-point && npm run build
```

预期：`dist/server/index.js` / `index.mjs` 更新，无 TS 报错。若 `types/generated/contentTypes.d.ts` 因新字段被重生成，一并提交。

- [ ] **Step 2: 本地 dev 冒烟**

确认本机 Strapi dev（127.0.0.1:1337）运行且已加载新 dist（必要时重启）。用 curl 验证新路由可达性（未登录返回 401 而非 404）：

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:1337/api/zhao-point/v1/my/activity/demo/unlock-check
curl -s -o /dev/null -w "%{http_code}" -X PUT http://127.0.0.1:1337/api/zhao-point/v1/my/activity/signup/1/questionnaire
```

- [ ] **Step 3: 提交 dist 产物**

```bash
git add plugins/zhao-point/dist plugins/zhao-point/server/types
git commit -m "build(zhao-point): 活动奖励 v2 插件 dist"
```

---

## web 管理端

### Task 7: activity-reward-config.vue 组件

**Files:**
- Create: `web/src/components/activity-reward-config.vue`

- [ ] **Step 1: 创建组件骨架（props/emits）**

```vue
<template>
  <view class="reward-config">
    <!-- 启用开关 -->
    <!-- 通道单选（radio 四选一） -->
    <!-- 权益选择方式（selectMode 下拉 + selectN 输入） -->
    <!-- 奖励列表编辑器 -->
  </view>
</template>
<script setup>
const props = defineProps({
  rewardConfig: { type: Object, default: () => null },
  formConfig: { type: Array, default: () => [] },
  questionnaire: { type: Object, default: () => null },
})
const emit = defineEmits(['update:rewardConfig'])
</script>
```

- [ ] **Step 2: 迁移并改造奖励编辑器逻辑（自 form.vue）**

从 `form.vue` 迁移：`rewardTypeLabels/Values`、`conditionLabels/Values`、`outlineKindLabels/Values`、`addReward/removeReward/moveReward`、`pickCourse/pickArticle/pickLesson`、`normReward`。`conditionLabels/Values` 扩为五值：

```js
const conditionLabels = ['无条件', '微信授权登录', '关注公众号', '留联系方式', '回答调查问卷']
const conditionValues = ['none', 'wechat_auth', 'subscribe', 'contact', 'survey']
```

组件自行 import：`getCourseList`（../../api/course.js）、`articleApi`（../../api/website.js）、`getLessonList`（../../api/course.js），并在 `pickArticle/pickLesson` 内联原有 `ensureRelOptions` 的加载逻辑（加载 article/lesson 关联选项）。

- [ ] **Step 3: 通道单选 UI（v-model:rewardConfig.channel）**

四个 radio：留联系方式(contact)/回答调查问卷(survey)/微信授权登录(wechat_auth)/关注公众号(subscribe)，点击后写 `{ type, label }`。兼容迁移：`onMounted` 时若 `rewardConfig.channel` 为空但 `infoChannels` 存在，取首个映射（contact/survey 直映，其余默认 contact）。

- [ ] **Step 4: 选择方式 UI**

`selectMode` picker（全选 all / 任选 any / 单选 one），`selectMode==='any'` 时显示 `selectN` 数字输入（默认 1）。

- [ ] **Step 5: 条件下拉可用性禁用**

按「数据可得性」在条件 picker 中禁用并提示：
- `contact`：`formConfig` 中不存在 `type==='phone' && required===true` 字段 → 禁用，提示「需在报名表单设置电话必填」；
- `survey`：`questionnaire?.enabled !== true || !questionnaire?.fields?.length` → 禁用，提示「需开启问卷并添加题目」；
- `wechat_auth` / `subscribe` / `none` 始终可用。

```js
const contactAvailable = computed(() =>
  props.formConfig.some((f: any) => f?.type === 'phone' && f?.required === true))
const surveyAvailable = computed(() =>
  !!props.questionnaire && props.questionnaire.enabled === true &&
  Array.isArray(props.questionnaire.fields) && props.questionnaire.fields.length > 0)
```

- [ ] **Step 6: 提交**

```bash
git add web/src/components/activity-reward-config.vue
git commit -m "feat(web): 活动奖励配置组件 activity-reward-config（通道单选/选择方式/条件可用性）"
```

---

### Task 8: activity-questionnaire.vue 组件

**Files:**
- Create: `web/src/components/activity-questionnaire.vue`

- [ ] **Step 1: 创建组件骨架**

```vue
<script setup>
const props = defineProps({ questionnaire: { type: Object, default: () => null } })
const emit = defineEmits(['update:questionnaire'])
</script>
```

- [ ] **Step 2: 启用开关 + 标题输入**

`enabled` switch、`title` input（默认「调查问卷」）。

- [ ] **Step 3: 字段编辑器（复用 formConfig 编辑同款机制）**

自包含字段编辑器，参照 `form.vue` 中 `formConfig` 的字段列表 UI 与函数（`addQuestionFieldAt`、`removeQuestionField`、类型 picker、options 编辑、模板导入）。字段类型白名单：text/phone/textarea/radio/select/multi/number。

- [ ] **Step 4: 默认「调查问卷模板」按钮**

```js
const QUESTIONNAIRE_TEMPLATE = [
  { key: 'satisfaction', label: '满意度', type: 'radio', options: ['非常满意', '满意', '一般', '不满意'], required: false },
  { key: 'gain', label: '本次收获', type: 'multi', options: ['知识技能', '人脉拓展', '行业洞察', '其他'], required: false },
  { key: 'suggestion', label: '改进建议', type: 'textarea', required: false },
]
function applyDefaultTemplate() {
  const cur = props.questionnaire || {}
  emit('update:questionnaire', { ...cur, title: cur.title || '调查问卷', fields: QUESTIONNAIRE_TEMPLATE.map(f => ({ ...f })) })
}
```

- [ ] **Step 5: 提交**

```bash
git add web/src/components/activity-questionnaire.vue
git commit -m "feat(web): 活动问卷配置组件 activity-questionnaire（字段编辑器/模板）"
```

---

### Task 9: form.vue 挂载组件并聚合提交

**Files:**
- Modify: `web/src/pages/activity/form.vue`

- [ ] **Step 1: 引入并注册组件**

在 script setup 中（当前 import 区，第 697 行 `PageHeader` 附近）追加：

```js
import ActivityRewardConfig from '../../components/activity-reward-config.vue'
import ActivityQuestionnaire from '../../components/activity-questionnaire.vue'
```

- [ ] **Step 2: 替换报名奖励配置区块为组件**

将 template 第 462-587 行「报名奖励配置」整个 section 替换为：

```html
<view class="form-section">
  <view class="section-title">报名奖励配置</view>
  <view class="form-tip">报名成功自动发放/解锁奖励；先完成「解锁通道」，再按选择方式领取已满足条件的权益</view>
  <ActivityRewardConfig
    v-model="form.rewardConfig"
    :form-config="form.formConfig"
    :questionnaire="form.questionnaire" />
</view>
```

- [ ] **Step 3: 新增问卷配置 section**

在报名表单（formConfig）section 之后、报名奖励 section 之前插入：

```html
<view class="form-section">
  <view class="section-title">调查问卷（报名表单下方，选填）</view>
  <ActivityQuestionnaire v-model="form.questionnaire" />
</view>
```

- [ ] **Step 4: form 状态新增 questionnaire**

`form` 定义（第 779-784 行附近）追加 `questionnaire: null`。

- [ ] **Step 5: load() 归一化 questionnaire**

在 `loadForm` 中 `rewardConfig` 归一化（第 1371-1377 行）后追加：

```js
questionnaire: data.questionnaire && typeof data.questionnaire === 'object'
  ? {
      enabled: data.questionnaire.enabled === true,
      title: data.questionnaire.title || '调查问卷',
      fields: Array.isArray(data.questionnaire.fields) ? data.questionnaire.fields.map(cloneField) : [],
    }
  : null,
```

- [ ] **Step 6: submit() 聚合 questionnaire 与奖励 config 新结构**

`handleSubmit` 的 submitData 中：
- `rewardConfig` 分支（第 1449-1466 行）改输出新结构，并兼容旧 `infoChannels` → `channel` 迁移：

```js
rewardConfig: form.rewardConfig && form.rewardConfig.loginEnabled
  ? {
      loginEnabled: true,
      channel: form.rewardConfig.channel && form.rewardConfig.channel.type
        ? { type: form.rewardConfig.channel.type, label: form.rewardConfig.channel.label || '' }
        : undefined,
      selectMode: form.rewardConfig.selectMode || 'all',
      selectN: Math.max(1, Number(form.rewardConfig.selectN) || 1),
      rewards: (form.rewardConfig.rewards || []).filter(r => r && r.name && r.type).map(r => {
        const base = { id: r.id, type: r.type, name: r.name, mode: r.mode, condition: r.condition }
        if (r.type === 'points') return { ...base, amount: Number(r.amount) || 0 }
        if (r.type === 'course_trial') return { ...base, courseId: r.courseId }
        if (r.type === 'course_outline') {
          if (r.kind === 'article') return { ...base, kind: 'article', articleId: r.articleId }
          if (r.kind === 'file') return { ...base, kind: 'file', link: r.link }
          return { ...base, kind: 'lesson', lessonId: r.lessonId }
        }
        if (r.type === 'coupon') return { ...base, couponId: Number(r.couponId) || 0 }
        return base
      }),
    }
  : undefined,
questionnaire: form.questionnaire && form.questionnaire.enabled && (form.questionnaire.fields || []).length
  ? {
      enabled: true,
      title: form.questionnaire.title || '调查问卷',
      fields: (form.questionnaire.fields || []).filter(f => f?.key && f?.label).map(f => ({
        key: f.key, label: f.label, type: f.type, required: f.required === true,
        options: Array.isArray(f.options) ? f.options : undefined,
        placeholder: f.placeholder || undefined,
        min: f.min, max: f.max,
      })),
    }
  : undefined,
```

- [ ] **Step 7: 清理已迁移到组件的奖励函数**

删除 form.vue 中已迁移至 `activity-reward-config.vue` 的函数与常量（保留 `normReward` 供 load 归一化）：`toggleRewardEnabled`、`hasInfoChannel`、`toggleInfoChannel`、`addReward`、`removeReward`、`moveReward`、`pickCourse`、`pickArticle`、`pickLesson`、`rewardTypeLabels/Values`、`conditionLabels/Values`、`outlineKindLabels/Values` 及对应 `*Name/*Index` helper。确认 script 中无残留引用（`ensureRelOptions` 若仅被已删函数引用则一并删除）。

- [ ] **Step 8: 提交**

```bash
git add web/src/pages/activity/form.vue
git commit -m "refactor(web): 活动编辑页挂载奖励/问卷组件并聚合提交"
```

---

## C 端（shao）

### Task 10: api.ts 扩展

**Files:**
- Modify: `shao/services/api.ts`

- [ ] **Step 1: signupActivity 增 questionnaireData**

```typescript
export async function signupActivity(
  activityId: string,
  formData?: Record<string, any>,
  chosenRewards?: string[],
  questionnaireData?: Record<string, any>,
) {
  const res = await request('/zhao-point/v1/my/activity/signup', {
    method: 'POST',
    data: {
      activityId,
      ...(formData && Object.keys(formData).length ? { formData } : {}),
      ...(chosenRewards?.length ? { chosenRewards } : {}),
      ...(questionnaireData && Object.keys(questionnaireData).length ? { questionnaireData } : {}),
    },
  })
  return res?.data ?? res
}
```

- [ ] **Step 2: 新增 fillQuestionnaire / unlockCheck**

```typescript
/** 补填问卷（signupId 来自报名响应），返回 { ok, unlockInfo, newlyUnlocked } */
export async function fillQuestionnaire(signupId: number, answers: Record<string, any>) {
  const res = await request(`/zhao-point/v1/my/activity/signup/${signupId}/questionnaire`, {
    method: 'PUT',
    data: { answers },
  })
  return res?.data ?? res
}

/** 解锁状态探测（报名前/关注后刷新），返回 { loginAuth, subscribed, channel, conditions, channelDone, selectMode, selectN, rewards } */
export async function unlockCheck(
  activityId: string,
  formData?: Record<string, any>,
  questionnaireData?: Record<string, any>,
) {
  const res = await request(`/zhao-point/v1/my/activity/${activityId}/unlock-check`, {
    method: 'POST',
    data: {
      ...(formData && Object.keys(formData).length ? { formData } : {}),
      ...(questionnaireData && Object.keys(questionnaireData).length ? { questionnaireData } : {}),
    },
  })
  return res?.data ?? res
}
```

- [ ] **Step 3: 提交**

```bash
git add shao/services/api.ts
git commit -m "feat(shao): 活动奖励 v2 api（signup 传问卷/补填问卷/解锁探测）"
```

---

### Task 11: detail.vue 递进式引导流程

**Files:**
- Modify: `shao/pages/activity/detail.vue`

- [ ] **Step 1: 状态与 computed 扩展**

导入 `fillQuestionnaire, unlockCheck`；新增 ref：`questionnaireData`、`subscribed`、`unlockStatus`、`signupId`、`showQuestionnaire`（补填问卷弹层）。新增 computed：

```typescript
/** 通道归一化：channel.type 优先，兼容旧 infoChannels 首个映射（默认 contact） */
const channelType = computed(() => {
  const ch = rewardCfg.value?.channel?.type
  if (ch) return ch
  const legacy = (Array.isArray(rewardCfg.value?.infoChannels) ? rewardCfg.value.infoChannels : [])[0]?.channel
  return legacy === 'survey' ? 'survey' : 'contact'
})

/** 通道门槛是否达成（subscribe 依赖后端 unlockCheck 返回） */
const channelDone = computed(() => {
  const t = channelType.value
  if (t === 'contact') return channelFilledValue('contact')
  if (t === 'survey') return surveyFilledValue()
  if (t === 'wechat_auth') return loginAuth.value
  if (t === 'subscribe') return subscribed.value
  return true
})

/** 是否已填问卷（至少一个字段有值） */
function surveyFilledValue(): boolean {
  const d = questionnaireData.value
  if (!d || typeof d !== 'object') return false
  return Object.keys(d).some((k: string) => {
    const v = d[k]
    return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  })
}
```

- [ ] **Step 2: unlockedRewards 改为 channelDone + condition（含 subscribe）**

替换 `unlockedRewards`（第 356-366 行）：

```typescript
const unlockedRewards = computed(() => {
  const rewards = Array.isArray(rewardCfg.value?.rewards) ? rewardCfg.value.rewards : []
  if (!channelDone.value) return [] // 未过通道门槛：全部不可领
  return rewards.filter((r: any) => {
    if (!r?.id) return false
    const c = r.condition || (r.loginRequired ? 'wechat_auth' : (r.channel || 'none'))
    if (c === 'wechat_auth') return loginAuth.value
    if (c === 'subscribe') return subscribed.value
    if (c === 'contact') return channelFilledValue('contact')
    if (c === 'survey') return surveyFilledValue()
    return true
  })
})
```

同时保留 `unlockStatus` 中的 `rewards[].unlocked`（来自后端 unlockCheck）用于「去达成」引导展示；`unlockedRewards` 用于可勾选列表。

- [ ] **Step 3: 引导流程重构（openRewardGuide）**

- `openRewardGuide()`：先调 `unlockCheck(id, signupData, questionnaireData)` 填充 `unlockStatus/loginAuth/subscribed`；step 依据 `channelType`/`channelDone` 决定：
  - `channelType==='wechat_auth' && !loginAuth` → step `'login'`；
  - `!channelDone` → step `'info'`（引导完成通道）；
  - 否则 → step `'reward'`。
- Step `'info'` 内容按通道类型渲染：
  - `contact`：表单电话必填提示 + 已填校验；
  - `survey`：问卷字段渲染（复用现有字段渲染，绑定 `questionnaireData`）；
  - `wechat_auth`：授权按钮（`chooseAuthLogin`）；
  - `subscribe`：「去关注」按钮（`redirectToSubscribePage`）＋「我已关注」按钮（重新 `unlockCheck` 刷新 `subscribed`）。
- 移除原 `nextInfoStep`/`chooseSilentLogin` 多通道引导逻辑（`chooseSilentLogin` 保留为「暂不完成，直接报名」降级：step → `'reward'`，但 `channelDone=false` 时不可领权益）。

- [ ] **Step 4: selectMode 约束勾选**

替换 `toggleGuideReward`（第 422-428 行）：

```typescript
function toggleGuideReward(r: any) {
  if (r.mode !== 'multi') return // 单选自动发放，不可取消
  const mode = unlockStatus.value?.selectMode || 'all'
  const n = Math.max(1, Number(unlockStatus.value?.selectN) || 1)
  const i = chosenRewards.value.indexOf(r.id)
  if (i >= 0) chosenRewards.value.splice(i, 1)
  else if (mode === 'one') chosenRewards.value = [r.id]
  else if (mode === 'any') { if (chosenRewards.value.length < n) chosenRewards.value.push(r.id) }
  else chosenRewards.value.push(r.id) // all：全选
}
```

- [ ] **Step 5: doSignup 传 questionnaireData 并记录 signupId**

`doSignup` 中 `signupActivity(id, formData, chosenRewardsArg, questionnaireData.value)`；响应 `ok` 时记录 `signupId.value = result.signupId`。补填问卷入口：报名成功后若存在 `survey` 条件权益未达成，展示「补填问卷解锁权益」按钮 → 打开 `showQuestionnaire` 弹层 → 提交调 `fillQuestionnaire(signupId, answers)` → toast 展示 `newlyUnlocked` 文案并刷新状态。

- [ ] **Step 6: 问卷渲染**

在引导 step `'info'`（通道为 survey 时）与补填问卷弹层中，复用现有字段渲染（`f.type` text/phone/textarea/radio/select/multi/number），绑定 `questionnaireData.value[f.key]`。问卷字段取自 `activity.value?.questionnaire?.fields`（需后端 detail 返回 questionnaire，活动 schema 新增字段后 `populate: "*"` 会带出）。

- [ ] **Step 7: 提交**

```bash
git add shao/pages/activity/detail.vue
git commit -m "feat(shao): 活动奖励 v2 递进式领取流程（通道门槛/关注引导/selectMode/补填问卷）"
```

---

## 验收

### Task 12: 验收脚本 accept-activity-reward-v2.cjs

**Files:**
- Create: `scripts/accept-activity-reward-v2.cjs`

- [ ] **Step 1: 基于 v1 复制骨架**

以 `scripts/accept-activity-reward.cjs` 为基底（复用 `api/register/purgeActivitySignups/purgeUserPoints/purgeSsoOf` 等辅助函数与零残留清理骨架），命名 `accept-activity-reward-v2.cjs`。

- [ ] **Step 2: 覆盖 v2 场景断言**

新增/改造以下测试块（对齐 spec 验收要点）：
1. **通道门槛四类**：分别建 rewardConfig `channel.type=contact|survey|wechat_auth|subscribe` 的活动，`u_noop`（无绑定、无表单、无问卷）报名 → 断言 `unlockInfo.channelDone===false`、`granted` 为空、不可领（`chosenRewards` 为空）；再补足对应通道（填电话 / 填问卷 / 预插 sso+wechat 绑定 / 预插绑定且 `subscribe=1`）后报名 → 断言可领。
2. **权益五条件**：单活动 rewards 覆盖 `none/wechat_auth/subscribe/contact/survey`，验证各自独立判定（subscribe 用预插 `sso-third-party-binding.subscribe=1`，本地 mock 下 `refreshSubscribe` 失败静默降级为该值）。
3. **selectMode 三态**：`all`（multi 全部自动入 `chosenRewards`）、`one`（传入 2 个 multi → 后端截断为 1 个）、`any`（selectN=2，传 3 个 → 截断为 2）。
4. **补填问卷解锁二次领取幂等**：channel=survey、存在 `condition=survey` 的 multi 积分奖励；`u` 报名时不填问卷 → 不发放；`PUT questionnaire` 填问卷 → `newlyUnlocked` 返回该奖励、积分到账；再次 `PUT` → `newlyUnlocked` 为空、积分不重复累加（断言 `point_record` 数量不变）。
5. **报名选填问卷**：channel=contact 活动，报名时带 `questionnaireData` → 正常入 `activity_signup.questionnaireData`。
6. **旧数据兼容迁移**：rewardConfig 用旧格式（`infoChannels:[{channel:'contact'}]` + `rewards[].loginRequired`/`.channel`）建活动 → signup 正常，通道解析为 contact、`condition=wechat_auth` 按 loginAuth 判定、`condition=contact` 按表单电话判定。
7. **零残留**：活动/报名/点记录/优惠券/sso 绑定/测试用户全部清理，断言清理后计数为 0。

- [ ] **Step 3: 运行验收**

前置：本地 Strapi dev 运行 + zhao-point 已重编译（Task 6）。执行：

```bash
cd e:/code/basic && node scripts/accept-activity-reward-v2.cjs
```

预期：全部 PASS；任何 FAIL 回查对应服务逻辑并修复后重跑。

- [ ] **Step 4: 提交**

```bash
git add scripts/accept-activity-reward-v2.cjs
git commit -m "test(zhao-point): 活动奖励 v2 端到端验收脚本"
```

---

### Task 13: 整体回归与收口

**Files:**
- 收尾

- [ ] **Step 1: 全量回归**

- 前端构建：`cd e:/code/web && npm run build:h5`、`cd e:/code/shao && npm run build:h5`（uni-app 产物 dist 随源码提交，确认无编译错误）。
- 后端：确认 zhao-point dist 已重建（Task 6），zhao-sso 无改动无需重建。
- 再次运行 Task 12 验收脚本确认全 PASS。

- [ ] **Step 2: 收口清理**

- 停本机 Strapi dev 进程。
- `git restore dist/`（还原根 app dist，勿用 `git checkout -- .`）。
- 删除临时诊断脚本/日志（若有），grep 自查 `DEBUG|console.log|log.info` 调试标记无残留。

- [ ] **Step 3: 提交收口**

```bash
git add -A
git commit -m "chore: 活动奖励 v2 全量回归收口"
```

---

## 风险与注意

- **关注状态实时性**：`hasSubscribe` 判定前先 `refreshSubscribe` 刷新（失败静默降级绑定表缓存值）；`subscribe` 依赖微信事件回调，非微信/无绑定环境一律 false，仅 contact/survey 可用（符合 spec）。
- **补填重算幂等**：二次领取沿用「新解锁才发放」+ 逐项 `grantReward`（内部无新增幂等键，依赖 unlockInfo.chosenRewards 去重），验收脚本必须断言积分不重复累加。
- **拆组件回归**：rewardConfig/问卷拆组件后，form.vue 的 load/submit 字段聚合必须回归（Task 9 Step 5/6），避免编辑旧活动丢数据。
- **路由通配冲突**：`/my/activity/:documentId/...` 与 `/my/activity/signup/...` 前缀需按顺序注册（Task 5 Step 2 已排）。
- **不新增依赖**：订阅判定复用 zhao-sso `refreshSubscribe`，问卷收集复用 `collectFormData` 机制，均不新增 package.json 依赖。
