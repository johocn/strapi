# 活动报名引导与奖励发放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让活动报名不强制留联系方式，通过微信授权登录与信息解锁的分步引导，让客户自选奖励并系统自动发放，兼顾线索获取与报名转化。

**Architecture:** 方案 A（最简复用，无新增 content-type）。后端 `zhao-point` 在 `activity` 加 `rewardConfig` json、`activity-signup` 加 `unlockInfo` json；`signup` 服务放宽必填校验、做解锁判定与逐项奖励发放（复用 `earnPoints`、`grantCourseTrial`、sop 通知、优惠券信息返回）。前端 `shao/pages/activity/detail.vue` 报名入口改造成分步引导（登录方式 → 信息解锁 → 奖励菜单 → 确认报名），按 H5/微信环境分流。

**Tech Stack:** Strapi 5 插件（zhao-point / zhao-deal / zhao-sso）TypeScript service；uni-app（shao C 端）。

---

## 关键实现决策（先读）

1. **报名必填放宽仅作用于「存在 rewardConfig 的活动」**，非微信/H5 纯网页且未配 rewardConfig 时仍走既有必填校验，行为不回归。
2. **解锁判定字段来源**
   - `loginAuth`：调用 `zhao-sso / sso-sop.resolveSsoUserForUpUser(upUserId)` 解析 sso 用户，再校验该 sso 用户是否已绑定微信公众号 openid（查 `sso-wx-account`/微信授权绑定记录，或 sso-user 的 `openid_bound` 标记）。实现时以实际绑定表字段为准做幂等探测。
   - `channels.[contact|survey]`：按 `formConfig` 中 `channel` 标注，判断对应通道字段是否已填（非空）。
3. **奖励发放 = 一次性、幂等**，逐项独立 dedupe key `act:{activityId}:{uid}:{rewardId}`，靠「是否已写进 `unlockInfo.chosenRewards`」判断（重入不重复发）。
4. **优惠券发放的真实语义**：`zhao-deal` 目前**无用户领券记录模型**（coupon/coupon-collection 均无 user 关系）。方案 A 禁止新增 content-type，故 coupon 发放 = 按 `couponId` 查 `plugin::zhao-deal.coupon`，将其 `promoLink / amountDesc / useRule / useCondition / endAt` 回传给用户并记入 `unlockInfo`，即「告知领券链接」，不建用户-券绑定。若后续要强绑定需另立项。

### 数据模型（复用设计文档 §3）

`activity.rewardConfig`（json）：
```json
{
  "loginEnabled": true,
  "infoChannels": [
    { "channel": "contact", "label": "留联系方式" },
    { "channel": "survey",  "label": "填调查问卷" }
  ],
  "rewards": [
    { "id": "r1", "type": "points", "name": "报名积分", "amount": 50, "mode": "single" },
    { "id": "r2", "type": "course_trial", "name": "试听课程", "courseId": "<course id>", "mode": "single" },
    { "id": "r3", "type": "course_outline", "name": "课前培训大纲", "kind": "article", "articleId": "<docId>", "mode": "multi" },
    { "id": "r4", "type": "coupon", "name": "优惠券", "couponId": "<coupon id>", "mode": "single" }
  ]
}
```
- `mode: single` → 解锁后自动发放；`mode: multi` → 前端让用户自选，回传 `chosenRewards` 后发放。
- `course_outline.kind` ∈ `article | file | lesson`（按设计文档 §6，分别对应文章授权/文件链接/课时课程授权）。

`activity-signup.unlockInfo`（json）：
```json
{
  "loginAuth": true,
  "channels": { "contact": true, "survey": false },
  "chosenRewards": ["r1", "r3"]
}
```

---

### Task 1: activity & activity-signup 加 json 字段

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/content-types/activity/schema.json`
- Modify: `basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json`

- [ ] **Step 1: activity 加 `rewardConfig`**
  在 `activity/schema.json` 的 `formConfig` 之后新增：
  ```json
  "rewardConfig": { "type": "json" }
  ```

- [ ] **Step 2: activity-signup 加 `unlockInfo`**
  在 `activity-signup/schema.json` 的 `formData` 之后新增：
  ```json
  "unlockInfo": { "type": "json" }
  ```

- [ ] **Step 3: 验证 schema 与类型生成**
  Run: `cd basic && pnpm --dir plugins/zhao-point dev` （或仅启动过一次触发重建）
  Expected: 无 schema 错误；`plugins/zhao-point/types/generated/contentTypes.d.ts` 生成 `rewardConfig` / `unlockInfo` 字段。

- [ ] **Step 4: 提交（含生成的 contentTypes.d.ts）**
  Run（在 `basic` 仓库）:
  ```bash
  git add plugins/zhao-point/server/src/content-types/activity/schema.json \
          plugins/zhao-point/server/src/content-types/activity-signup/schema.json \
          plugins/zhao-point/types/generated/contentTypes.d.ts
  git commit -m "feat(activity): add rewardConfig/unlockInfo json fields"
  ```
  > 生产生效需本地重建插件 dist 并随仓库提交：`cd plugins/zhao-point && npm run build`（收尾统一做，见收尾 Task）。

---

### Task 2: form.ts 支持 channel 标注与通道判断

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/form.ts`

- [ ] **Step 1: 新增通道归一/判断 helper**
  在 `form.ts` 顶部（`collectFormData` 之后）新增纯函数：
  ```typescript
  /** 供解锁判定：判断某通道(contact/survey)在 formData 中是否已填(至少一个该通道字段非空) */
  export function channelFilled(formConfig: any, formData: any, channel: string): boolean {
    const fields = Array.isArray(formConfig) ? formConfig : [];
    const data = formData && typeof formData === "object" && !Array.isArray(formData) ? formData : {};
    const hit = fields.filter((f: any) => f?.channel === channel && f?.key);
    if (!hit.length) return false; // 该通道未配置字段 → 视为不可解锁
    return hit.some((f: any) => !isEmpty(data[f.key]));
  }
  ```
  （`isEmpty` 已在文件内定义。）

- [ ] **Step 2: 导出 helper**
  把 `channelFilled` 加入默认导出的对象 `{ validateFormData, collectFormData, channelFilled }`。

- [ ] **Step 3: 冒烟**
  确认 `import { channelFilled } from "./form"` 在 `form.ts` 自身可被引用无类型错误。

- [ ] **Step 4: 提交**
  Run:
  ```bash
  git add plugins/zhao-point/server/src/services/form.ts
  git commit -m "feat(activity): channelFilled helper for reward unlock"
  ```

---

### Task 3: activity.ts — signup 流程扩展（解锁判定 + 奖励发放）

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/services/activity.ts`
- Test: 见 Task 6 联调/验收

本任务在 `signup` 中接入 reward 逻辑，含独立 helper。**不改变**现有已报名/名额/候补/退费/通知链路。

- [ ] **Step 1: 新增 helper：微信授权状态**
  在 `resolveUserChannelId` 之后新增：
  ```typescript
  /** 是否已微信授权登录：解析 sso 用户并探测是否绑定公众号 openid */
  async function hasWechatAuth(strapi: any, upUserId: number): Promise<boolean> {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (!sop) return false;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso?.id) return false;
      // 探测微信授权绑定（以实际 sso-wx 绑定表为准）：sso 用户有 openid_bound 标记或存在 provider=wechat 授权记录
      const wx = strapi.db.query("plugin::zhao-sso.sso-wx-account")
        .findOne({ where: { sso_user: sso.id } });
      return !!wx;
    } catch {
      return false;
    }
  }
  ```
  > **实现时核对**：先 `Grep plugin::zhao-sso` 的 schema，确认微信授权绑定表名与字段（可能是 `sso-wx-account` / `sso-wx-user-binding` / sso-user 上直接 `openid_bound`），用真实表名替换。找不到绑定表则回退：`!!sso.openid_bound || !!sso.openid`。

- [ ] **Step 2: 新增 helper：奖励发放（按类型分发，幂等）**
  在 `grantShareReward` 之前新增：
  ```typescript
  /** 逐项发放奖励。chosenRewards 已通过解锁筛选；重复键幂等由调用方保证。 */
  async function grantReward(strapi: any, opts: {
    userId: number; activityId: number; activityDocumentId: string;
    reward: any; channelId?: number;
  }) {
    const { userId, activityId, reward } = opts;
    if (!reward?.id || !reward?.type) return false;
    switch (reward.type) {
      case "points": {
        const amount = Math.max(0, Number(reward.amount) || 0);
        if (amount <= 0) return false;
        await strapi.plugin("zhao-point").service("point").earnPoints({
          userId, action: "activity_reward", points: amount, // 金额走 override，不靠配死 rule
          source: "activity", method: "activity_reward",
          remark: `活动奖励:${reward.name ?? "奖励"}`, userChannelId: opts.channelId,
        });
        return true;
      }
      case "course_trial": {
        const courseId = Number(reward.courseId);
        if (!courseId) return false;
        await grantCourseTrial(strapi, userId, courseId);
        return true;
      }
      case "course_outline":
        return await grantOutline(strapi, { userId, reward });
      case "coupon": {
        const c = await strapi.db.query("plugin::zhao-deal.coupon")
          .findOne({ where: { id: Number(reward.couponId) || 0 } });
        return !!c; // 信息由调用方回填到 unlockInfo，此处仅为存在性幂等校验
      }
      default:
        return false;
    }
  }

  /** 大纲按 kind 分发：article→文章授权 / file→无需后端动作(前端领链接) / lesson→课时课程授权 */
  async function grantOutline(strapi: any, { userId, reward }: any) {
    const OUTLINE_LESSONS = "plugin::zhao-course.course-lesson";
    if (reward.kind === "article") {
      // 文章授权：追加到 activity.preUnlockArticles 或调用文章解锁 service（复用现有授权能力）
      await strapi.documents("plugin::zhao-point.activity").update({
        documentId: reward.activityDocumentId,
        data: { ... }, // 实现时按现存“文章预解锁”机制追加该文章到用户可见集合
      });
      return true;
    }
    if (reward.kind === "lesson" && reward.courseId) {
      await grantCourseTrial(strapi, userId, Number(reward.courseId));
      return true;
    }
    return true; // file 类型：仅返回下载链接，后端不动
  }
  ```
  > **实现时核对**：文章预解锁（`preUnlockArticles`）目前是活动维度 relation，非用户维度。若需「解锁文章给当前用户」，需确认是否有 `zhao-website` 的用户级文章授权表；若没有，方案 A 下按「活动维度文章已授权，前端展示」处理，不新增用户级记录。

- [ ] **Step 3: signup 入参增加 `chosenRewards`**
  修改 `signup` 签名：
  ```typescript
  async signup({ userId, activityId, formData, chosenRewards }: {
    userId: number; activityId: string; formData?: any; chosenRewards?: string[];
  })
  ```

- [ ] **Step 4: 宽放必填 + 解锁判定 + 奖励写入**
  在现 `validateFormData(formConfig, formData) // 拦截必填` 处（activity.ts:134-139）替换为：存在 `act.rewardConfig` 时放宽必填、并计算解锁。替换逻辑：
  ```typescript
  const rewardConfig = act.rewardConfig;
  const hasReward = !!rewardConfig && typeof rewardConfig === "object";

  // 1) 校验：rewardConfig 存在 → 仅校验“非空即可”类型层面的基本合理性，不拦截必填；
  //    否则维持原必填拦截。
  if (Array.isArray(formConfig) && formConfig.length && !hasReward) {
    const v = validateFormData(formConfig, formData);
    if (!v.ok) throw new FormValidationError(v.errors);
  }
  const storedFormData = Array.isArray(formConfig) && formConfig.length ? collectFormData(formConfig, formData) : undefined;

  // 2) 解锁判定
  const loginAuth = hasReward ? await hasWechatAuth(strapi, userId) : false;
  const channels: Record<string, boolean> = {};
  const infoChannels = Array.isArray(rewardConfig?.infoChannels) ? rewardConfig.infoChannels : [];
  for (const ic of infoChannels) {
    channels[ic.channel] = channelFilled(formConfig, formData, ic.channel);
  }
  const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
  //    解锁过滤：Group1 授权类奖励需 loginAuth；channel 类奖励需对应通道已填
  const visible = rewardList.filter((r: any) => isRewardUnlocked(r, loginAuth, channels));
  //    单选直接选定；多选以 chosenRewards 为准（须是已解锁项）
  const autoChosen = visible
    .filter((r: any) => r.mode !== "multi")
    .map((r: any) => r.id);
  const multiIds = visible.filter((r: any) => r.mode === "multi").map((r: any) => r.id);
  const chosen = [
    ...autoChosen,
    ...(Array.isArray(chosenRewards) ? chosenRewards : []).filter((id) => multiIds.indexOf(id) >= 0),
  ];
  ```
  新增顶层 helper：
  ```typescript
  function isRewardUnlocked(r: any, loginAuth: boolean, channels: Record<string, boolean>): boolean {
    if (r?.loginRequired && !loginAuth) return false;      // 若奖励声明需授权登录
    if (r?.channel && !channels[r.channel]) return false;  // 若奖励挂在某信息通道
    return true;
  }
  ```
  > 说明：`rewardConfig.loginEnabled` 控制「是否展示授权登录引导」，`isRewardUnlocked` 的 channel/loginRequired 是可选声明；奖励未声明依赖则视为解锁（静默登录也可领，符合「没有授权登录奖励默认静默报名成功即可」）。

- [ ] **Step 5: 建 signup 记录时写 `unlockInfo`**
  现有两处 `SIGNS_UID.create`（候补那支 + active 那支）各追加 `unlockInfo`。候补不进奖励发放，但记录解锁现场：
  - 候补 create 的 data：追加 `...(hasReward ? { unlockInfo: { loginAuth, channels, chosenRewards: [] } } : {})`
  - active create 的 data：追加 `...(hasReward ? { unlockInfo: { loginAuth, channels, chosenRewards: chosen } } : {})`

- [ ] **Step 6: 发放奖励（仅 active 报名成功路径）**
  在 active 支 `SIGNS_UID.create` 之后、`grantPoints(activity_signup)` 之前插入：
  ```typescript
  if (hasReward && chosen.length) {
    const userChannelId = await resolveUserChannelId(strapi, userId);
    for (const r of rewardList) {
      if (chosen.indexOf(r.id) < 0) continue;          // 未被选定（未解锁或 multi 未选）
      try {
        await grantReward(strapi, {
          userId,
          activityId: act.id, activityDocumentId: act.documentId,
          reward: r, channelId: userChannelId,
        });
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] grantReward ${r.id} failed: ${e.message}`);
      }
    }
  }
  ```
  > 已写 `chosenRewards` 于 unlockInfo → 重入（重复点击/回调）时 `dup` 命中提前返回，天然幂等。

- [ ] **Step 7: 提交**
  Run:
  ```bash
  git add plugins/zhao-point/server/src/services/activity.ts
  git commit -m "feat(activity): reward unlock & auto-grant in signup"
  ```

---

### Task 4: controller 透传 chosenRewards 与展示字段

**Files:**
- Modify: `basic/plugins/zhao-point/server/src/controllers/activity.ts:97-115`
- Modify: `basic/plugins/zhao-point/server/src/routes/content-api.ts`（如需要新增“可领奖励预览”端点，非必须）

- [ ] **Step 1: signup controller 透传 `chosenRewards` 并返回发放票**
  修改 `controllers/activity.ts signup`：
  ```typescript
  const { activityId, formData, chosenRewards } = ctx.request.body || {};
  const result = await activitySvc().signup({ userId, activityId, formData, chosenRewards });
  ```
  并在 `wrap(result)` 前把 `result.unlockinfo`（含 `loginAuth/channels/chosenRewards` 与每项已发奖励）附带到返回值，供前端确认提示（如 `<result>.granted` 数组）。

- [ ] **Step 2: 提交**
  Run:
  ```bash
  git add plugins/zhao-point/server/src/controllers/activity.ts
  git commit -m "feat(activity): pass chosenRewards and echo granted rewards"
  ```

---

### Task 5: 重建插件 dist 并收口

**Files:**
- Build: `basic/plugins/zhao-point`

- [ ] **Step 1: 停本机 dev（避免 dist/编译竞争）**
  按项目惯例确认 1337 未在跑，或只针对插件 build。

- [ ] **Step 2: 构建插件 dist**
  Run:
  ```bash
  cd basic/plugins/zhao-point && npm run build
  ```
  Expected: `plugins/zhao-point/dist/` 更新；无 TS 报错。

- [ ] **Step 3: 回归基础 signup（无 rewardConfig 的活动）**
  后端 dev 起 `npm run dev`；用普通活动走一次 `signupActivity`，确认：
  - 无 rewardConfig → 必填校验照旧、无 reward 分支执行、返回值不含 unlockInfo。
  - Expected: 行为与改动前一致（不回归）。

- [ ] **Step 4: 提交（dist 属有效产物需提交）**
  Run:
  ```bash
  git add plugins/zhao-point/dist plugins/zhao-point/server plugins/zhao-point/types 2>/dev/null || true
  git add plugins/zhao-point
  git commit -m "build(activity): rebuild zhao-point dist for reward feature" || true
  ```

---

### Task 6: 前端 detail.vue 分步引导

**Files:**
- Modify: `e:\code\shao\pages\activity\detail.vue`
- Modify: `e:\code\shao\services\api.ts:942-948`

- [ ] **Step 1: api.ts `signupActivity` 支持 `chosenRewards`**
  ```typescript
  export async function signupActivity(
    activityId: string,
    formData?: Record<string, any>,
    chosenRewards?: string[],
  ) {
    const res = await request('/zhao-point/v1/my/activity/signup', {
      method: 'POST',
      data: {
        activityId,
        ...(formData && Object.keys(formData).length ? { formData } : {}),
        ...(chosenRewards?.length ? { chosenRewards } : {}),
      },
    })
    return res?.data ?? res
  }
  ```

- [ ] **Step 2: detail.vue 读取 rewardConfig 与分环境入口分流**
  在 `onSignup()`（detail.vue:470）改为：
  ```typescript
  function onSignup() {
    const rc = activity.value?.rewardConfig
    const wx = /* 判断 `#ifdef H5` 且 UA 含 MicroMessenger 或用 systemInfo platform/base */
    if (rc && (rc.loginEnabled || (rc.infoChannels?.length) || rc.rewards?.length) && !wx) {
      // 微信环境：走分步引导；H5 纯网页→沿用现有（电话必填）
      openRewardGuide()
    } else if (formFields.value.length) {
      openSignupForm()   // 现有弹出表单（non-wx H5 / 无 rewardConfig）
    } else {
      doSignup()
    }
  }
  ```
  微信环境判定用现成封装（`utils/login-chain` 等已判 `MicroMessenger`，找不到则 `// #ifdef H5` + `/MicroMessenger/i.test(navigator.userAgent)`）。

- [ ] **Step 3: 分步引导组件逻辑（登录方式 → 信息解锁 → 奖励菜单 → 确认）**
  在 `<script setup>` 增加状态：
  ```typescript
  const rewardCfg = computed(() => activity.value?.rewardConfig ?? null)
  const guideStep = ref<'login' | 'info' | 'reward' | 'confirm' | ''>('')
  const loginAuth = ref(false)          // 用户是否选择/已微信授权登录
  const filledChannels = ref<Record<string, boolean>>({})
  const chosenRewards = ref<string[]>([])
  ```
  关键函数：
  ```typescript
  function openRewardGuide() { guideStep.value = 'login' }
  async function chooseSilent() {
    // 静默登录：不额外解锁授权类奖励
    loginAuth.value = false; guideStep.value = 'info'
  }
  async function chooseAuthLogin() {
    // 复用现有微信授权登录能力（拿 openid/头像）；失败降级提示继续
    loginAuth.value = true; guideStep.value = 'info'
  }
  async function nextInfo() {
    // 按 infoChannels 逐个引导：有联系方式则填，有问卷则填，都有→先做完当前再下一个；都没有→跳过
    guideStep.value = nextChannel() ? 'info' : 'reward'
  }
  async function nextReward() {
    // 渲染已解锁奖励：single 自动领取并 toast；multi 供勾选
    guideStep.value = 'confirm'
  }
  async function confirmSignup() {
    const formData = { ...signupData.value }
    await doSignup(formData, chosenRewards.value)
  }
  ```
  并把 `doSignup` 签名扩展为 `doSignup(formData?, chosenRewards? = [])`，内部 `signupActivity(id, formData, chosenRewards)`；成功后按返回的 `granted` 数组逐个 toast（「已获得：报名积分 / 试听课程」等）；`waitlisted` 分支维持候补提示。奖励菜单项数据来自 `rewardCfg.rewards` 过滤：`(!r.loginRequired || loginAuth)` 且 `(!r.channel || filledChannels[r.channel])`。

- [ ] **Step 4: 头部引导介绍文案**
  登录 Step 顶部展示授权登录好处文案（来自设计：模板信息通知 + 获得积分）；授权选项且无头像 → 提示「完善头像」后再继续（调用已存在的用户信息完善能力）。

- [ ] **Step 5: 提交**
  Run（在 `shao` 仓库）:
  ```bash
  git add pages/activity/detail.vue services/api.ts
  git commit -m "feat(activity): step-by-step reward signup guide in detail.vue"
  ```

---

### Task 7: 联调与验收（signup 全链路 + 幂等）

**Files:**
- Test: `basic/scripts/accept-activity-reward.cjs`（新建，遵循项目验收脚本命名 `scripts/accept-*.cjs`）

- [ ] **Step 1: 准备测试数据**
  - 造一个 `signup_open` 活动，配 `rewardConfig`（含 single points=50、multi course_outline、coupon）与 `formConfig`（含一个 `channel:"contact"` 的 phone 字段、一个无 channel 的字段）。
  - 造测试用户，并预插 sso 绑定以便 `loginAuth` 判定（若无微信 openid，则设计上 loginAuth=false，验证静默路径；如需验证授权路径，用一个已绑定 sso 的用户）。

- [ ] **Step 2: 断言——静默 + 留联系方式（single 自动发、multi 选发）**
  - body：`{ activityId, formData:{ phone:'13800000000' }, chosenRewards:['r3'] }`。
  - 期望：返回 `ok:true`；`unlockInfo.channels.contact=true`、`loginAuth=false`；`chosenRewards` 含 r2/single 自动项 + r3；积分 50 到账（`earnPoints` 记录 `activity_reward`）；coupon 项信息回传。

- [ ] **Step 3: 断言——重复报名幂等**
  再 POST 同用户/同活动。
  - 期望：`reason:'already_signed_up'`，奖励不重复发放（积分仅 +50）。

- [ ] **Step 4: 断言——无 rewardConfig 回归**
  用一个 `rewardConfig` 为空的普通活动 + 必填 phone 不填。
  - 期望：返回必填表单错误（原逻辑不回归）。

- [ ] **Step 5: 清理零残留 + 收口**
  - 删除测试活动/报名/积分记录（清理脚本自带）。
  - 停 dev；`git restore dist/` 还原根 app dist（pathspec `dist/` 不匹配 `plugins/*/dist`，安全）；删除临时 accept 脚本或按项目管理要求保留。
  - 检查无 DEBUG/console 调试残留（`Grep 'console|DEBUG'` 改动文件）。

- [ ] **Step 6: 提交**
  Run:
  ```bash
  git add scripts/accept-activity-reward.cjs
  git commit -m "test(activity): accept activity reward signup flow"
  ```

---

### 收尾（部署前置，重活提醒）

- [ ] **生产部署（服务器）**: 在 shao 服务器 `cd /www/apps/strapi` 执行 `git pull`（本地已提交插件 dist）→ `source /etc/profile.d/nvm.sh` → `pm2 restart strapi` 或 `pm2 delete strapi && pm2 start ecosystem.config.cjs`（如 schema 变更需重启加载）。
- [ ] **前端部署**: web 运营端（h.joho.cn）与 shao C 端（v.joho.cn）由**用户自行构建上传**（按既有分工约定，Agent 不代劳）。仅当需要给活动配置 `rewardConfig` 时，Admin 后台编辑活动 JSON 字段填入配置。

## 风险与边界（对照设计文档 §6、§7）

- 幂等：signup 重复校验 + unlockInfo 落库 + 逐项 dedupe 已覆盖。
- 补发：本次仅预留 `unlockInfo`，不实现管理端手动补发。
- 模板通知关注限制：后端 sop 已降级不断链，前端仅提示。
- 文章预解锁若缺用户级表：方案 A 按活动维度处理，不新增 content-type（见 Task3 Step2 备注）。
- 插件 schema 加 json 后需随功能提交 `types/generated/contentTypes.d.ts`（Task 1 Step 4）。