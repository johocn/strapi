# 活动报名引导与奖励发放设计

> 日期：2026-08-23
> 范围：C 端活动详情页报名引导 + 后端奖励自动发放
> 方向：方案 A（最简复用，无新增 content-type）

## 1. 背景与目标

现状：活动报名页 `pages/activity/detail.vue` 按 `formConfig` 渲染必填报名字段，报名走 `signupActivity`；后端 `zhao-point` 的 `signup` 已具备表单校验、名额原子占用、候补、积分扣费、报名积分 `activity_signup`、微信模板通知（`act_confirm/act_before/act_promoted/act_receipt`）、试听课授权（`grantCourseTrial`）。

目标（两者兼顾：线索 + 转化）：
- 不强制留联系方式，但给客户引导。
- 静默登录什么也没有；微信授权登录可获得好处（模板信息通知、获得积分），需要引导介绍。
- 留联系方式或填调查问卷（若有）可获得：课前培训大纲、试听课程、积分、优惠券。
- 客户可自行选择奖励，系统自动发放。

## 2. 设计原则

- 方案 A：仅给 `activity` 加一个 json 字段 `rewardConfig`，其余全部复用现有能力，不新增 content-type。
- **联系方式和调查问卷即现有 `formConfig` 字段**，通过通道标签（contact/survey）区分，报名不再受必填拦截。
- 报名前引导：引导流程插在报名确认之前。

## 3. 数据模型（最小新增）

### activity.rewardConfig（json）

```json
{
  "loginEnabled": true,
  "infoChannels": [
    { "channel": "contact", "label": "留联系方式" },
    { "channel": "survey",  "label": "填调查问卷" }
  ],
  "rewards": [
    { "id": "r1", "type": "points",         "name": "报名积分",     "amount": 50 },
    { "id": "r2", "type": "course_trial",   "name": "试听课程",     "courseId": "<course docId>" },
    { "id": "r3", "type": "course_outline", "name": "课前培训大纲", "kind": "article", "articleId": "<docId>" },
    { "id": "r4", "type": "coupon",         "name": "优惠券",       "couponId": "<coupon docId>" }
  ]
}
```

业务规则：
- **报名不强制**：`formConfig` 字段一律降级为选填，仅作为解锁依据，不再拦截报名（H5 纯网页除外，见 §5）。
- **解锁阈值**：奖励仅在对应通道/登录方式解锁后可见/可领。
- **单选直接发放、多选客户选择后发放**：`mode`(single/multi)，配置在 rewardConfig，管理端决定哪些项需要用户自选。

### activity-signup 新增字段

- `unlockInfo`（json）：记录本次报名的解锁与领取结果。

```json
{
  "loginAuth": true,
  "channels": { "contact": true, "survey": false },
  "chosenRewards": ["r1", "r3"]
}
```

### formConfig 通道标注（可选，最小改动）

- 现有 `formConfig` 数组元素可选手动标 `channel: "contact" | "survey"`，用于「联系方式」与「调查问卷」两类字段的区分与引导展示。未标注则默认归为报名基本信息，不影响解锁。

## 4. 后端流程（signup）

微信环境且 `rewardConfig` 存在时：

1. **报名不拦截**：`formConfig` 全部选填（放宽当前"required 即拦截"逻辑；H5 纯网页除外）。
2. **解锁判定**：
   - Group1 授权登录（有 openid/微信公众号绑定）→ `loginAuth=true`，解锁「模板通知 + 报名积分」。
   - Group2 通道 `contact` / `survey` → 按用户是否填写对应字段置 `true`。
3. **奖励裁剪**：仅返回「已解锁」的奖励；`mode=single` 直接自动领取，`mode=multi` 交由前端自选后回传 `chosenRewards`。
4. **建 signup 记录**：写入 `unlockInfo`。
5. **逐项自动发放**（每项独立幂等键 `act:{docId}:{uid}:{rewardId}`）：
   - `points` → `earnPoints(action=activity_reward)`，**金额走 override 定款，不靠配死的 rule**。
   - `course_trial` → 复用已有 `grantCourseTrial`。
   - `course_outline` → 按 `kind` 分发：`article`→`preUnlockArticles` 授权 / `file`→记录下载链接供前端领取 / `lesson`→`grantCourseTrial`。
   - `coupon` → `zhao-deal` 的 `coupon-collection` 领券。
6. **通知**：`act_confirm` 模板照发（依赖关注公众号，不强制）。

非微信/H5 纯网页：维持电话必填，不展示随机/授权登录分组。

## 5. 前端流程（pages/activity/detail.vue）

改造报名入口为分步引导，步骤如下：

- **H5 纯网页**：电话为必填（沿用现逻辑，不分组）。
- **微信环境**，点「立即报名」→
  1. **Step1 登录方式**：静默 vs 微信授权登录。授权登录文案介绍好处（模板通知 + 获得积分）；选授权且无头像 → 提示完善/补头像。
  2. **Step2 信息解锁**：有联系方式则引导填，有问卷则引导填；两者都有 → 二选一先做、做完再引导另一个；都没有 → 跳过直接结束。
  3. **Step3 奖励菜单**：单选直接领取并 toast 提示；多选由用户选定后提交。
  4. **Step4 确认报名**：提交后端完成报名与自动发放。

## 6. 边界与风险

- **幂等**：signup 已有重复校验；奖励逐项用 dedupe key，重复点击/重复回调不重复发放。
- **补发**：`unlockInfo` 记录可支撑管理端手动补发；本次不实现，仅留字段。
- **模板通知关注限制**：需用户默认关注公众号，后端 `sop` 已做降级不断链，前端仅提示。
- **大纲三种资源**：奖励项 `kind` 三选一（article/file/lesson），分别接文章授权/文件链接/课时课程授权，不新增 content-type。
- **server 依赖约束**：不新增 package.json dependencies；改动集中在 `zhao-point` 插件 schema（加 json 字段）与 service，插件需本地重建 dist 随仓库提交。

## 7. 涉及的改动范围

- `basic/plugins/zhao-point/server/src/content-types/activity/schema.json`：加 `rewardConfig` json。
- `basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json`：加 `unlockInfo` json。
- `basic/plugins/zhao-point/server/src/services/activity.ts`：signup 流程放宽必填 + 解锁判定 + 奖励发放（含类型分发的 helper）。
- `basic/plugins/zhao-point/server/src/services/form.ts`：表单收集支持字段 `channel` 标注（如需要）。
- `shao/pages/activity/detail.vue`：报名分步引导（登录方式/信息解锁/奖励菜单）+ 按环境分流。
- 相关 API 层（shao `services/api.ts`）：`signupActivity` 支持回传 `chosenRewards` 与读取 `unlockInfo/rewardConfig`。