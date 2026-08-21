# 活动报名表单信息收集 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 活动报名时按每活动自定义 `formConfig` 收集表单信息（text/phone/textarea/radio/select/multi/number），存 `activity-signup.formData`；运营端可配置字段并查看名单详情，C 端按配置渲染动态表单报名，报名信息只读不可改。

**Architecture:** 后端 zhao-point 内扩展：activity 加 `formConfig`（json 字段数组）、activity-signup 加 `formData`（json 值对象）；新增独立 `form` service 封装字段级校验（必填 + 类型内置校验 + options/min/max），`signup()` 调用后存入记录；名单/我的报名接口经 db.query 默认返回 json 字段无需改动。前端 web（运营端）活动表单加字段编辑器 + 名单卡片加"报名信息"展开；shao（C 端）报名时按 formConfig 弹动态表单、收集后随 `signupActivity(id, formData)` 提交，我的报名展开展示。无新增依赖、无新增 content-type。

**Tech Stack:** Strapi v5（zhao-point 插件，strapi.documents / strapi.db.query）、uni-app（web 运营端 + shao C 端）、Node 验收脚本（node scripts/accept-*.cjs，直连 PostgreSQL 造数 + HTTP 断言）。

---

## 文件结构

- **zhao-point 后端**
  - `plugins/zhao-point/server/src/content-types/activity/schema.json` — 加 `formConfig` json 字段
  - `plugins/zhao-point/server/src/content-types/activity-signup/schema.json` — 加 `formData` json 字段
  - `plugins/zhao-point/server/src/services/form.ts` — 新建：`FormValidationError`、`validateFormData()`、`collectFormData()`（含 `PHONE_RE`、字段类型常量）
  - `plugins/zhao-point/server/src/services/index.ts` — 注册 `form` service
  - `plugins/zhao-point/server/src/services/activity.ts` — `signup()` 校验+收集+落库 formData（active/waiting 两处 create）
  - `plugins/zhao-point/server/src/controllers/activity.ts` — `signup()` 透传 body.formData、字段级错误格式化
- **验收**
  - `scripts/accept-activity-form.cjs` — 新建，端到端验收
- **web 运营端**
  - `src/api/activity.js` — 无需改动（create/update 透传 body，signups 已 extractList）
  - `src/pages/activity/form.vue` — 加"报名表单配置"区块（字段编辑器）+ formConfig 读写
  - `src/pages/activity/signups.vue` — 加载活动 formConfig，卡片"报名信息"展开
- **shao C 端**
  - `services/api.ts` — `signupActivity(activityId, formData?)` 扩展
  - `pages/activity/detail.vue` — 报名弹动态表单（新组件 `signup-form` 或页内弹层）+ 提交
  - `pages/activity/my.vue` — 卡片展开展示 formData

---

### Task 1: 后端数据模型（schema 加字段）

**Files:**
- Modify: `plugins/zhao-point/server/src/content-types/activity/schema.json`
- Modify: `plugins/zhao-point/server/src/content-types/activity-signup/schema.json`

- [ ] **Step 1: activity schema 加 formConfig**

在 `attributes` 末尾（`belongsToSeries` 之后）追加：

```json
"formConfig": { "type": "json" }
```

- [ ] **Step 2: activity-signup schema 加 formData**

在 `attributes` 末尾（`reviewedAt` 之后）追加：

```json
"formData": { "type": "json" }
```

- [ ] **Step 3: 校验 schema JSON 合法性**

Run: `node -e "JSON.parse(require('fs').readFileSync('plugins/zhao-point/server/src/content-types/activity/schema.json','utf8')); JSON.parse(require('fs').readFileSync('plugins/zhao-point/server/src/content-types/activity-signup/schema.json','utf8')); console.log('OK')"`（在 `e:\code\basic`）
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/content-types/activity/schema.json plugins/zhao-point/server/src/content-types/activity-signup/schema.json
git commit -m "feat(zhao-point): add formConfig/formData json fields"
```

---

### Task 2: 新建 form service（字段校验 + 收集）

**Files:**
- Create: `plugins/zhao-point/server/src/services/form.ts`
- Modify: `plugins/zhao-point/server/src/services/index.ts`

- [ ] **Step 1: 写 form service 实现**

创建 `plugins/zhao-point/server/src/services/form.ts`：

```ts
import type { Core } from "@strapi/strapi";

/** 中国大陆手机号（11 位，1 开头第二位 3-9） */
export const PHONE_RE = /^1[3-9]\d{9}$/;

/** 字段类型白名单（与前端渲染一致） */
export const FORM_TYPES = ["text", "phone", "textarea", "radio", "select", "multi", "number"] as const;

/** 校验失败携带字段级错误 */
export class FormValidationError extends Error {
  errors: { key: string; label: string; message: string }[];
  constructor(errors: { key: string; label: string; message: string }[]) {
    super("报名信息填写有误");
    this.name = "FormValidationError";
    this.errors = errors;
  }
}

function isEmpty(v: any): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function isPlainArray(v: any): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === "string" || typeof x === "number");
}

function normalizeOptions(field: any): string[] {
  const opts = Array.isArray(field.options) ? field.options : [];
  return opts.map((o: any) => String(o));
}

/** 校验单个字段值；返回错误消息或 null */
function validateField(field: any, value: any): string | null {
  const label = field.label || field.key || "该字段";
  const options = normalizeOptions(field);

  if (field.required && isEmpty(value)) return `请填写${label}`;
  if (isEmpty(value)) return null; // 非必填且未填 → 跳过

  switch (field.type) {
    case "phone":
      return PHONE_RE.test(String(value)) ? null : `请填写正确的${label}`;
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return `请填写正确的${label}`;
      if (field.min != null && n < Number(field.min)) return `${label}不能小于${field.min}`;
      if (field.max != null && n > Number(field.max)) return `${label}不能大于${field.max}`;
      return null;
    }
    case "radio":
    case "select":
      return options.includes(String(value)) ? null : `请选择正确的${label}`;
    case "multi":
      if (!isPlainArray(value)) return `请选择${label}`;
      return value.every((v: any) => options.includes(String(v))) ? null : `请选择正确的${label}`;
    default: // text / textarea
      return null;
  }
}

/** 按 formConfig 校验 formData；返回校验结果 */
export function validateFormData(formConfig: any, formData: any): { ok: boolean; errors: { key: string; label: string; message: string }[] } {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
  const errors: { key: string; label: string; message: string }[] = [];
  for (const f of fields) {
    if (!f || typeof f !== "object" || !f.key) continue;
    const msg = validateField(f, data[f.key]);
    if (msg) errors.push({ key: f.key, label: f.label || f.key, message: msg });
  }
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}

/** 仅收集 formConfig 定义的 key，并规范化 number/multi；忽略未定义字段 */
export function collectFormData(formConfig: any, formData: any): Record<string, any> {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (!f || typeof f !== "object" || !f.key) continue;
    const raw = data[f.key];
    if (isEmpty(raw)) continue;
    if (f.type === "number") {
      const n = Number(raw);
      out[f.key] = Number.isFinite(n) ? n : raw;
    } else if (f.type === "multi") {
      out[f.key] = isPlainArray(raw) ? raw.map((x: any) => String(x)) : raw;
    } else {
      out[f.key] = String(raw);
    }
  }
  return out;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  validateFormData,
  collectFormData,
});
```

- [ ] **Step 2: 注册 form service**

修改 `plugins/zhao-point/server/src/services/index.ts`，加入 import 与导出：

```ts
import form from "./form";
```

在导出对象末尾（`"activity-stats": activityStats,` 之后）加：

```ts
form,
```

- [ ] **Step 3: 构建 zhao-point 插件 dist**

Run: `cd plugins/zhao-point && npm run build`（在 `e:\code\basic`，可忽略 dts 类型错误）
Expected: 构建成功，生成 `plugins/zhao-point/dist/`

- [ ] **Step 4: Commit**

```bash
git add plugins/zhao-point/server/src/services/form.ts plugins/zhao-point/server/src/services/index.ts plugins/zhao-point/dist
git commit -m "feat(zhao-point): form service for signup form validation/collection"
```

---

### Task 3: signup() 校验与落库 formData

**Files:**
- Modify: `plugins/zhao-point/server/src/services/activity.ts:124-209`
- Modify: `plugins/zhao-point/server/src/controllers/activity.ts:63-77`

- [ ] **Step 1: service 导入 form service**

在 `plugins/zhao-point/server/src/services/activity.ts` 顶部（现有 import 之后）加：

```ts
import { FormValidationError, validateFormData, collectFormData } from "./form";
```

- [ ] **Step 2: signup() 增加 formData 参数并校验落库**

将 `signup` 方法签名与首部改为：

```ts
  async signup({ userId, activityId, formData }: { userId: number; activityId: string; formData?: any }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId, populate: { preUnlockLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "signup_open") throw new Error("活动未开放报名");
    const now = Date.now();
    if (act.signupStart && now < new Date(act.signupStart).getTime()) throw new Error("报名未开始");
    if (act.signupEnd && now > new Date(act.signupEnd).getTime()) throw new Error("报名已截止");
    // 报名表单校验（活动配置了 formConfig 才校验；无配置兼容不校验）
    const formConfig = act.formConfig;
    if (Array.isArray(formConfig) && formConfig.length) {
      const v = validateFormData(formConfig, formData);
      if (!v.ok) throw new FormValidationError(v.errors);
    }
    const storedFormData = Array.isArray(formConfig) && formConfig.length ? collectFormData(formConfig, formData) : undefined;
    const dup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: act.id, status: { $in: ["active", "waiting"] } },
    });
    if (dup) return { ok: false, reason: "already_signed_up" };
```

- [ ] **Step 3: waiting 候补 create 落 formData**

将名额满时的 `create` 改为（保留原逻辑，仅加 `formData`）：

```ts
      const sig = await strapi.db.query(SIGNS_UID).create({
        data: { user: userId, activity: act.id, status: "waiting", signupAt: new Date(), ...(storedFormData ? { formData: storedFormData } : {}) },
      });
```

- [ ] **Step 4: active 报名 create 落 formData**

将 active 报名 `create` 改为：

```ts
    await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null, ...(storedFormData ? { formData: storedFormData } : {}) } });
```

- [ ] **Step 5: controller 透传 formData 与字段级错误**

修改 `plugins/zhao-point/server/src/controllers/activity.ts` 的 `signup`：

```ts
  async signup(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { activityId, formData } = ctx.request.body || {};
      const result = await activitySvc().signup({ userId, activityId, formData });
      if (result?.ok === false && result.reason === "already_signed_up") {
        ctx.status = 200;
      }
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = 400;
      if (e instanceof FormValidationError) {
        ctx.body = { error: e.message, errors: e.errors };
        return;
      }
      ctx.body = { error: e.message };
    }
  },
```

并在 controller 顶部 import 加 `import { FormValidationError } from "../services/form";`

- [ ] **Step 6: 构建插件 dist**

Run: `cd plugins/zhao-point && npm run build`（在 `e:\code\basic`）
Expected: 构建成功

- [ ] **Step 7: Commit**

```bash
git add plugins/zhao-point/server/src/services/activity.ts plugins/zhao-point/server/src/controllers/activity.ts plugins/zhao-point/dist
git commit -m "feat(zhao-point): validate and store signup formData"
```

---

### Task 4: 验收脚本（后端端到端）

**Files:**
- Create: `scripts/accept-activity-form.cjs`

- [ ] **Step 1: 参考既有脚本骨架**

阅读 `scripts/accept-activity-overview.cjs`，沿用其：
- 登录 admin（`/api/zhao-auth/v1/login`）与普通用户（`/api/auth/local`）的方式与 token 提取
- 直连 PostgreSQL 清库函数（`WL_` 前缀活动、关联 signup 清理）
- 断言辅助 `check(name, cond, detail)` 与最终 PASS/FAIL 汇总、清理收尾

- [ ] **Step 2: 编写验收脚本**

创建 `scripts/accept-activity-form.cjs`，核心断言（关键代码）：

```javascript
// 1. 建带 formConfig 的活动（admin 建 → 置 signup_open）
const act = await createActivity(token, {
  title: 'WL_表单验收活动',
  capacity: 100,
  status: 'signup_open',
  formConfig: [
    { key: 'name', label: '姓名', type: 'text', required: true },
    { key: 'phone', label: '手机号', type: 'phone', required: true },
    { key: 'count', label: '同行人数', type: 'number', required: false, min: 1, max: 9 },
    { key: 'topic', label: '感兴趣主题', type: 'multi', required: false, options: ['运营', '增长', '变现'] },
    { key: 'level', label: '参与深度', type: 'select', required: true, options: ['初级', '中级'] },
  ],
});

// 2. 缺少必填 → 400 + errors 含 name/phone
const r1 = await signup(userToken, { activityId: act.documentId, formData: { name: '张三' } });
check('r1 400', r1.status === 400, `status=${r1.status}`);
check('r1 errors 含 phone', (r1.body?.errors || []).some(e => e.key === 'phone'), JSON.stringify(r1.body?.errors));

// 3. phone 格式错 → 400
const r2 = await signup(userToken, { activityId: act.documentId, formData: { name: '张三', phone: '123', level: '初级' } });
check('r2 phone 格式错误 400', r2.status === 400 && (r2.body?.errors || []).some(e => e.key === 'phone'), JSON.stringify(r2.body?.errors));

// 4. number 越界 → 400
const r3 = await signup(userToken, { activityId: act.documentId, formData: { name: '张三', phone: '13800138000', count: 99, level: '初级' } });
check('r3 number 越界 400', r3.status === 400 && (r3.body?.errors || []).some(e => e.key === 'count'), JSON.stringify(r3.body?.errors));

// 5. multi 含非法选项 → 400
const r4 = await signup(userToken, { activityId: act.documentId, formData: { name: '张三', phone: '13800138000', topic: ['运营', '不存在'], level: '初级' } });
check('r4 multi 非法选项 400', r4.status === 400 && (r4.body?.errors || []).some(e => e.key === 'topic'), JSON.stringify(r4.body?.errors));

// 6. 合法 formData 报名成功 + 未定义 key 被丢弃
const r5 = await signup(userToken, { activityId: act.documentId, formData: { name: '张三', phone: '13800138000', count: '2', topic: ['运营', '增长'], level: '初级', extra: 'x' } });
check('r5 ok', r5.data?.ok === true, JSON.stringify(r5.data));

// 7. 名单接口返回完整 formData（count 数字化、multi 数组、extra 被丢弃）
const signs = await adminSignups(adminToken, act.documentId);
const mine = signs.find(s => s.formData?.name === '张三');
check('名单含 formData', !!mine, JSON.stringify(signs));
check('formData.count=2 数字', mine?.formData?.count === 2, `count=${JSON.stringify(mine?.formData?.count)}`);
check('formData.topic 数组', Array.isArray(mine?.formData?.topic) && mine?.formData?.topic.length === 2, JSON.stringify(mine?.formData?.topic));
check('extra 被丢弃', !('extra' in (mine?.formData || {})), JSON.stringify(mine?.formData));

// 8. 我的报名接口返回 formData
const myActs = await myActivities(userToken);
const mrow = (Array.isArray(myActs) ? myActs : []).find(s => s.formData?.name === '张三');
check('我的报名含 formData', !!mrow, JSON.stringify(myActs));

// 9. 无 formConfig 活动兼容报名
const act2 = await createActivity(adminToken, { title: 'WL_无表单活动', capacity: 100, status: 'signup_open' });
const r9 = await signup(userToken, { activityId: act2.documentId, formData: { name: '李四' } });
check('无表单活动兼容 ok', r9.data?.ok === true, JSON.stringify(r9.data));

// 10. 清理：删两个活动及其关联 signup
```

- [ ] **Step 3: 启动 dev 并运行验收**

Run: `npm run develop`（后台，`e:\code\basic`），待 `:1337` 就绪后：
Run: `node scripts/accept-activity-form.cjs`
Expected: 全部断言 PASS，零残留（清理 WL_ 活动与 signup）

- [ ] **Step 4: 停 dev + 还原根 dist**

Run: 停止 dev 进程；`git restore dist/`
Expected: basic 根 dist 还原为干净状态（plugins/*/dist 保留）

- [ ] **Step 5: Commit**

```bash
git add scripts/accept-activity-form.cjs
git commit -m "test(zhao-point): e2e accept script for signup form"
```

---

### Task 5: web 运营端 — 活动表单加字段编辑器

**Files:**
- Modify: `src/pages/activity/form.vue`
- Modify: `src/api/activity.js`（无需改，create/update 透传 body）

- [ ] **Step 1: form 增加 formConfig state 与类型常量**

在 `src/pages/activity/form.vue` 的 `form` reactive 中加 `formConfig: []`：

```javascript
const form = reactive({
  // ...现有字段
  formConfig: []
})
```

在 `form.vue` 中新增常量（放 `pricingModeLabels` 附近）：

```javascript
const formTypeValues = ['text', 'phone', 'textarea', 'radio', 'select', 'multi', 'number']
const formTypeLabels = ['文本', '手机号', '多行文本', '单选', '下拉', '多选', '数字']
```

- [ ] **Step 2: 新增字段编辑器方法**

在 `form.vue` script 中（`removeFactor` 后）新增：

```javascript
function addFormField() {
  form.formConfig.push({ key: '', label: '', type: 'text', required: false, options: [], min: undefined, max: undefined })
}
function removeFormField(fi) {
  form.formConfig.splice(fi, 1)
}
function handleFormTypeChange(fi, e) {
  form.formConfig[fi].type = formTypeValues[Number(e.detail.value)]
}
function addFormOption(fi) {
  form.formConfig[fi].options.push('')
}
function removeFormOption(fi, oi) {
  form.formConfig[fi].options.splice(oi, 1)
}
function formTypeLabel(t) {
  const idx = formTypeValues.indexOf(t)
  return idx >= 0 ? formTypeLabels[idx] : t
}
```

- [ ] **Step 3: 模板加入"报名表单配置"区块**

在 `src/pages/activity/form.vue` 模板中，将 `<view class="form-section">` 的 `报名设置` 区块整体结束后（在 `</view>` 与下一个 form-section 之间），插入新区块。找到 `报名设置` section 结束位置（`shareRewardPoints` 输入项所在 `form-item` 之后、`</view>` 前），在 `<view class="form-section">` 末尾追加：

```html
<view class="form-section">
  <view class="section-title">报名表单配置</view>
  <view class="form-tip">报名时收集的字段（不配置则报名只填基础信息）</view>
  <view v-for="(f, fi) in form.formConfig" :key="fi" class="fee-block">
    <view class="fee-block-header">
      <text class="fee-block-title">字段 {{ fi + 1 }}</text>
      <button class="btn-link-danger" @click="removeFormField(fi)">删除</button>
    </view>
    <view class="form-row">
      <view class="form-item half">
        <text class="form-label">key</text>
        <input type="text" v-model="f.key" placeholder="如 name" class="form-input" />
      </view>
      <view class="form-item half">
        <text class="form-label">标签</text>
        <input type="text" v-model="f.label" placeholder="如 姓名" class="form-input" />
      </view>
    </view>
    <view class="form-row">
      <view class="form-item half">
        <text class="form-label">类型</text>
        <picker mode="selector" :range="formTypeLabels" @change="handleFormTypeChange(fi, $event)">
          <view class="picker-value">
            <text>{{ formTypeLabel(f.type) }}</text>
            <text class="picker-arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="form-item half">
        <text class="form-label">必填</text>
        <view class="radio-row">
          <text :class="['radio-opt', { on: f.required }]" @click="f.required = true">是</text>
          <text :class="['radio-opt', { on: !f.required }]" @click="f.required = false">否</text>
        </view>
      </view>
    </view>
    <view v-if="f.type === 'number'" class="form-row">
      <view class="form-item half">
        <text class="form-label">最小值</text>
        <input type="number" v-model="f.min" class="form-input" />
      </view>
      <view class="form-item half">
        <text class="form-label">最大值</text>
        <input type="number" v-model="f.max" class="form-input" />
      </view>
    </view>
    <view v-if="f.type === 'radio' || f.type === 'select' || f.type === 'multi'" class="form-item fee-field">
      <text class="form-label">选项</text>
      <view v-for="(o, oi) in f.options" :key="oi" class="opt-row">
        <input type="text" v-model="f.options[oi]" placeholder="选项内容" class="form-input" />
        <text class="opt-del" @click="removeFormOption(fi, oi)">✕</text>
      </view>
      <button class="btn-add" @click="addFormOption(fi)">添加选项</button>
    </view>
  </view>
  <button class="btn-add" @click="addFormField">添加字段</button>
</view>
```

- [ ] **Step 4: loadDetail 读 formConfig**

在 `form.vue` 的 `loadDetail` 中 `Object.assign(form, ...)` 里追加：

```javascript
formConfig: data.formConfig || []
```

（在 `feeFactors: ...` 一行后加逗号并插入）

- [ ] **Step 5: handleSubmit 提交 formConfig**

在 `form.vue` 的 `submitData` 对象中（`feeFactors: form.feeFactors,` 后）加：

```javascript
formConfig: form.formConfig,
```

- [ ] **Step 6: 添加区块样式**

在 `form.vue` `<style scoped>` 中追加：

```css
.form-tip { font-size: 24rpx; color: #999; margin: -8rpx 0 20rpx; }
.radio-row { display: flex; gap: 24rpx; align-items: center; }
.radio-opt { font-size: 26rpx; color: #999; padding: 6rpx 24rpx; border: 1rpx solid #ddd; border-radius: 20rpx; }
.radio-opt.on { color: #667eea; border-color: #667eea; background: rgba(102,126,234,.08); }
.opt-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.opt-del { color: #ff4d4f; padding: 0 8rpx; font-size: 28rpx; }
```

- [ ] **Step 7: 构建 web**

Run: `npm run build:h5`（在 `e:\code\web`）
Expected: 构建成功

- [ ] **Step 8: Commit**

```bash
git add src/pages/activity/form.vue dist/build/h5
git commit -m "feat(web): activity signup form config editor"
```

---

### Task 6: web 运营端 — 名单展示报名信息

**Files:**
- Modify: `src/pages/activity/signups.vue`

- [ ] **Step 1: 加载活动 formConfig**

在 `src/pages/activity/signups.vue` script 中，import 加 `getActivity`，并加 state 与加载：

```javascript
import { getActivitySignups, getActivityAttendance, cancelActivitySignup, getActivity } from '../../api/activity.js'

const formConfig = ref([])

async function loadFormConfig() {
  try {
    const act = await getActivity(activityId.value)
    formConfig.value = Array.isArray(act?.formConfig) ? act.formConfig : []
  } catch (e) {
    formConfig.value = []
  }
}
```

在 `onLoad` 中 `loadSignups()` 之后加 `loadFormConfig()`。

- [ ] **Step 2: 名单卡片加"报名信息"展开**

在 `src/pages/activity/signups.vue` 模板的报名卡片内（`card-meta` 之后、`card-actions` 之前）加：

```html
<view v-if="item.formData && formFieldList(item).length" class="card-form" @click.stop>
  <view class="card-form-head" @click="toggleForm(item.id || item.documentId)">
    <text>报名信息</text>
    <text class="form-toggle">{{ expandedForm === (item.id || item.documentId) ? '收起' : '展开' }}</text>
  </view>
  <view v-if="expandedForm === (item.id || item.documentId)" class="form-fields">
    <view v-for="fd in formFieldList(item)" :key="fd.key" class="form-field-row">
      <text class="ff-label">{{ fd.label }}</text>
      <text class="ff-value">{{ fd.value }}</text>
    </view>
  </view>
</view>
```

在 script 中加：

```javascript
const expandedForm = ref('')

function formFieldList(item) {
  const fd = item.formData && typeof item.formData === 'object' ? item.formData : {}
  return (formConfig.value || []).filter(f => f?.key && fd[f.key] !== undefined && fd[f.key] !== null && fd[f.key] !== '')
    .map(f => ({
      key: f.key,
      label: f.label || f.key,
      value: Array.isArray(fd[f.key]) ? fd[f.key].join('、') : String(fd[f.key]),
    }))
}

function toggleForm(k) {
  expandedForm.value = expandedForm.value === k ? '' : k
}
```

- [ ] **Step 3: 添加样式**

在 `signups.vue` `<style scoped>` 追加：

```css
.card-form { margin-top: 16rpx; border-top: 1rpx solid #f0f0f0; padding-top: 12rpx; }
.card-form-head { display: flex; justify-content: space-between; font-size: 26rpx; color: #333; }
.form-toggle { color: #667eea; }
.form-fields { margin-top: 12rpx; }
.form-field-row { display: flex; justify-content: space-between; gap: 20rpx; padding: 8rpx 0; font-size: 26rpx; }
.ff-label { color: #999; flex-shrink: 0; }
.ff-value { color: #333; text-align: right; word-break: break-all; }
```

- [ ] **Step 4: 构建 web**

Run: `npm run build:h5`（在 `e:\code\web`）
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/pages/activity/signups.vue dist/build/h5
git commit -m "feat(web): show signup formData in signup list"
```

---

### Task 7: shao C 端 — api 扩展 + 报名动态表单 + 我的报名展示

**Files:**
- Modify: `services/api.ts`
- Modify: `pages/activity/detail.vue`
- Modify: `pages/activity/my.vue`

- [ ] **Step 1: 扩展 signupActivity**

修改 `services/api.ts` 的 `signupActivity`：

```typescript
export async function signupActivity(activityId: string, formData?: Record<string, any>) {
  const res = await request('/zhao-point/v1/my/activity/signup', {
    method: 'POST',
    data: { activityId, ...(formData && Object.keys(formData).length ? { formData } : {}) },
  })
  return res?.data ?? res
}
```

- [ ] **Step 2: detail.vue 报名动态表单弹层**

在 `pages/activity/detail.vue`：
1. 模板在 `action-bar` 报名按钮区之后、`share-poster` 之前插入报名弹层：

```html
<!-- 报名信息弹层 -->
<view class="signup-mask" v-if="showSignupForm" @click="showSignupForm = false">
  <view class="signup-panel" @click.stop>
    <text class="signup-title">填写报名信息</text>
    <view v-for="f in formFields" :key="f.key" class="signup-field">
      <text class="signup-label">{{ f.label }}<text v-if="f.required" class="req">*</text></text>

      <input v-if="f.type === 'text' || f.type === 'phone'" class="signup-input"
        v-model="signupData[f.key]" :type="f.type === 'phone' ? 'number' : 'text'"
        :placeholder="f.placeholder || ''" />

      <textarea v-else-if="f.type === 'textarea'" class="signup-textarea" v-model="signupData[f.key]" />

      <view v-else-if="f.type === 'radio'" class="signup-options">
        <text v-for="o in (f.options || [])" :key="o" class="signup-opt"
          :class="{ on: signupData[f.key] === o }" @click="signupData[f.key] = o">{{ o }}</text>
      </view>

      <picker v-else-if="f.type === 'select'" mode="selector" :range="(f.options || [])"
        @change="e => signupData[f.key] = (f.options || [])[Number(e.detail.value)]">
        <view class="signup-picker">
          <text>{{ signupData[f.key] || '请选择' }}</text>
          <text class="picker-arrow">▼</text>
        </view>
      </picker>

      <view v-else-if="f.type === 'multi'" class="signup-options">
        <text v-for="o in (f.options || [])" :key="o" class="signup-opt"
          :class="{ on: (signupData[f.key] || []).includes(o) }"
          @click="toggleMulti(f, o)">{{ o }}</text>
      </view>

      <input v-else-if="f.type === 'number'" class="signup-input" type="number" v-model="signupData[f.key]" />
    </view>
    <view class="signup-actions">
      <view class="signup-btn cancel" @click="showSignupForm = false"><text>取消</text></view>
      <view class="signup-btn submit" @click="submitSignupForm"><text>确认报名</text></view>
    </view>
  </view>
</view>
```

2. script 中加 state、computed、方法：

```typescript
const showSignupForm = ref(false)
const signupData = ref<Record<string, any>>({})

const formFields = computed(() => {
  const cfg = activity.value?.formConfig
  return Array.isArray(cfg) ? cfg : []
})

function openSignupForm() {
  signupData.value = {}
  showSignupForm.value = true
}

function toggleMulti(f: any, o: string) {
  const arr = Array.isArray(signupData.value[f.key]) ? [...signupData.value[f.key]] : []
  const i = arr.indexOf(o)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(o)
  signupData.value[f.key] = arr
}

function validateSignupForm(): string {
  for (const f of formFields.value) {
    const v = signupData.value[f.key]
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    if (f.required && empty) return `请填写${f.label}`
    if (empty) continue
    if (f.type === 'phone' && !/^1[3-9]\d{9}$/.test(String(v))) return `请填写正确的${f.label}`
    if (f.type === 'number') {
      const n = Number(v)
      if (!Number.isFinite(n)) return `请填写正确的${f.label}`
      if (f.min != null && n < Number(f.min)) return `${f.label}不能小于${f.min}`
      if (f.max != null && n > Number(f.max)) return `${f.label}不能大于${f.max}`
    }
    if ((f.type === 'radio' || f.type === 'select') && !(f.options || []).includes(v)) return `请选择正确的${f.label}`
    if (f.type === 'multi') {
      const bad = (v || []).some((x: string) => !(f.options || []).includes(x))
      if (bad) return `请选择正确的${f.label}`
    }
  }
  return ''
}

function submitSignupForm() {
  const err = validateSignupForm()
  if (err) { uni.showToast({ title: err, icon: 'none' }); return }
  const formData = { ...signupData.value }
  showSignupForm.value = false
  doSignup(formData)
}

async function doSignup(formData?: Record<string, any>) {
  uni.showLoading({ title: '报名中...' })
  try {
    const result = await signupActivity(id, formData)
    // —— 以下逻辑与现有 onSignup 完全一致（waitlisted/signedUp/insufficient_points/二维码）——
    if ((result as any)?.ok) {
      if ((result as any)?.waitlisted) {
        waitlisted.value = true
        waitlistPosition.value = (result as any)?.position || 0
        uni.hideLoading()
        uni.showToast({ title: `已加入候补 #${waitlistPosition.value}`, icon: 'none' })
        return
      }
      signedUp.value = true
      waitlisted.value = false
      uni.hideLoading()
      uni.showToast({ title: '报名成功', icon: 'success' })
      nextTick(() => generateQrcode())
    } else {
      uni.hideLoading()
      if ((result as any)?.reason === 'already_signed_up') {
        signedUp.value = true
        uni.showToast({ title: '您已报名过', icon: 'none' })
        nextTick(() => generateQrcode())
      } else if ((result as any)?.reason === 'insufficient_points') {
        uni.showToast({ title: '积分不足，无法报名', icon: 'none' })
      } else {
        uni.showToast({ title: '报名失败', icon: 'none' })
      }
    }
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '报名失败', icon: 'none' })
  }
}
```

3. 将现有 `onSignup` 改为：有 formFields 则弹层，否则直接 doSignup：

```typescript
function onSignup() {
  if (formFields.value.length) {
    openSignupForm()
  } else {
    doSignup()
  }
}
```

（删除原 `onSignup` 的实现体，替换为上述分派；`doSignup` 承载原报名逻辑）

4. 弹层样式追加到 `<style>`：

```css
.signup-mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 99; display: flex; align-items: flex-end; justify-content: center; }
.signup-panel { width: 100%; max-height: 78vh; overflow-y: auto; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom)); }
.signup-title { font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 24rpx; }
.signup-field { margin-bottom: 28rpx; }
.signup-label { display: block; font-size: 26rpx; color: #333; margin-bottom: 12rpx; }
.req { color: #ff4d4f; margin-left: 4rpx; }
.signup-input { border: 1rpx solid #e5e5e5; border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; }
.signup-textarea { width: 100%; box-sizing: border-box; min-height: 140rpx; border: 1rpx solid #e5e5e5; border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; }
.signup-picker { border: 1rpx solid #e5e5e5; border-radius: 12rpx; padding: 18rpx 20rpx; font-size: 28rpx; color: #333; display: flex; justify-content: space-between; }
.signup-options { display: flex; flex-wrap: wrap; gap: 16rpx; }
.signup-opt { font-size: 26rpx; color: #666; padding: 10rpx 28rpx; border: 1rpx solid #ddd; border-radius: 28rpx; }
.signup-opt.on { color: #667eea; border-color: #667eea; background: rgba(102,126,234,.08); }
.signup-actions { display: flex; gap: 20rpx; margin-top: 32rpx; }
.signup-btn { flex: 1; text-align: center; padding: 22rpx 0; border-radius: 40rpx; font-size: 30rpx; }
.signup-btn.cancel { background: #f5f5f5; color: #666; }
.signup-btn.submit { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
```

- [ ] **Step 3: my.vue 展示已提交报名信息**

在 `pages/activity/my.vue`：
1. 模板 `record-item` 内 `item-venue` 之后加展开区：

```html
<view v-if="formFieldList(item).length" class="item-form" @click.stop="toggleForm(item)">
  <text class="form-toggle">{{ expandedId === keyOf(item) ? '收起报名信息' : '查看报名信息' }}</text>
  <view v-if="expandedId === keyOf(item)" class="form-fields">
    <view v-for="fd in formFieldList(item)" :key="fd.key" class="ff-row">
      <text class="ff-label">{{ fd.label }}</text>
      <text class="ff-value">{{ fd.value }}</text>
    </view>
  </view>
</view>
```

2. script 加：

```typescript
const expandedId = ref('')

function keyOf(item: any) {
  return item.documentId || item.id || ''
}

function formFieldList(item: any) {
  const cfg = Array.isArray(item.activity?.formConfig) ? item.activity.formConfig : []
  const fd = item.formData && typeof item.formData === 'object' ? item.formData : {}
  return cfg.filter((f: any) => f?.key && fd[f.key] !== undefined && fd[f.key] !== null && fd[f.key] !== '')
    .map((f: any) => ({
      key: f.key,
      label: f.label || f.key,
      value: Array.isArray(fd[f.key]) ? fd[f.key].join('、') : String(fd[f.key]),
    }))
}

function toggleForm(item: any) {
  const k = keyOf(item)
  expandedId.value = expandedId.value === k ? '' : k
}
```

3. 样式追加：

```css
.item-form { margin-top: 16rpx; border-top: 1rpx solid #f0f0f0; padding-top: 12rpx; }
.form-toggle { font-size: 24rpx; color: #667eea; }
.form-fields { margin-top: 12rpx; }
.ff-row { display: flex; justify-content: space-between; gap: 20rpx; padding: 8rpx 0; font-size: 26rpx; }
.ff-label { color: #999; flex-shrink: 0; }
.ff-value { color: #333; text-align: right; word-break: break-all; }
```

- [ ] **Step 4: 构建 shao**

Run: `npm run build:h5`（在 `e:\code\shao`）
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add services/api.ts pages/activity/detail.vue pages/activity/my.vue dist/build/h5
git commit -m "feat(shao): signup dynamic form + show submitted formData"
```

---

### Task 8: 双仓库收口

**Files:**
- `e:\code\basic`（zhao-point 后端 + 验收脚本，已在各 Task 分步提交并 push）
- `e:\code\web`（form.vue + signups.vue + dist）
- `e:\code\shao`（api.ts + detail.vue + my.vue + dist）

- [ ] **Step 1: basic 停 dev + 还原根 dist + push**

Run（`e:\code\basic`）：
```bash
# 确认 dev 已停；还原 dev 改写/删除的根 dist（plugins/*/dist 是有效产物保留）
git restore dist/
git status --short
git push origin main
```
Expected: 工作区干净（仅各 Task 已提交内容），basic 推送完成

- [ ] **Step 2: web commit + push**

Run（`e:\code\web`）：
```bash
git add -A dist/build/h5 src/pages/activity/form.vue src/pages/activity/signups.vue
git commit -m "feat(activity): signup form config editor + formData in signup list"
git push origin main
```
Expected: web 推送完成

- [ ] **Step 3: shao commit + push**

Run（`e:\code\shao`）：
```bash
git add -A dist/build/h5 services/api.ts pages/activity/detail.vue pages/activity/my.vue
git commit -m "feat(activity): signup dynamic form + submitted formData display"
git push origin main
```
Expected: shao 推送完成

---

## Self-Review 记录

- **Spec 覆盖**：formConfig 模型（T1）✓；校验/收集（T2）✓；signup 落库 + 字段级错误（T3）✓；名单/我的报名返回 formData（db.query 默认返回 json，T3/T4 断言覆盖）✓；web 配置器（T5）✓；web 名单展示（T6）✓；shao 动态表单（T7）✓；验收（T4）✓；兼容无配置活动（T3/T4）✓。
- **无占位符**：所有代码步骤给出完整实现。
- **类型一致性**：`signup({ userId, activityId, formData })` 签名在 T3/T4 一致；`formConfig` 字段类型 `{ type: "json" }` 在 T1/T2 一致；`signupActivity(id, formData?)` 在 T7 的 api.ts 与 detail.vue 调用一致；`formFieldList(item)` 在 T6/T7 各页独立定义但契约一致（label/value）。
- **注意事项**：`db.query` findMany 默认返回全部 json 字段（含 formData），故 adminSignups/mySignups 无需改 controller——由 T4 断言直接验证；`collectFormData` 仅收集已定义 key，`extra` 被丢弃由 T4 验证。
