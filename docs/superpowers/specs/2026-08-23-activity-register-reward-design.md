# 活动报名引导与奖励发放设计

> 日期：2026-08-23（2026-08-24 补充「附加条件」模型细化）
> 范围：C 端活动详情页报名引导 + 后端奖励自动发放 + web 管理端奖励配置
> 方向：方案 A（最简复用，无新增 content-type）

## 1. 背景与目标

现状：活动报名页 `pages/activity/detail.vue` 按 `formConfig` 渲染必填报名字段，报名走 `signupActivity`；后端 `zhao-point` 的 `signup` 已具备表单校验、名额原子占用、候补、积分扣费、报名积分 `activity_signup`、微信模板通知（`act_confirm/act_before/act_promoted/act_receipt`）、试听课授权（`grantCourseTrial`）。

目标（两者兼顾：线索 + 转化）：
- 不强制留联系方式，但给客户引导。
- 静默授权登录 → **无任何奖励**，仅报名；微信授权登录可获得好处（模板信息通知、获得积分），需要引导介绍。
- 客户可按附加条件解锁奖励，客户可自行选择奖励（全选或任选），系统自动发放。
- 课程可能过期，故额外积分作为更划算的可选权益之一。

## 2. 设计原则

- 方案 A：仅给 `activity` 加一个 json 字段 `rewardConfig`，其余全部复用现有能力，不新增 content-type。
- **每个奖励项统一一个「附加条件」字段 `condition`**（四选一），替换昨日 `loginRequired(bool)+channel(string)` 的组合判定。
- **发放方式复用 `mode`**：`single`=基础自动发放（不进客户勾选菜单），`multi`=客户自选（全选/任选）。
- **联系方式和调查问卷即现有 `formConfig` 字段**，通过通道标签（contact/survey）区分，报名不再受必填拦截。
- 报名前引导：引导流程插在报名确认之前。

## 3. 数据模型（最小新增）

### activity.rewardConfig（json）

```json
{
  "loginEnabled": true,
  "infoChannels": [
    { "channel": "contact", "label": "留联系方式" },
    { "channel": "survey",  "label": "回答调查问卷" }
  ],
  "rewards": [
    { "id": "b1", "type": "points",         "name": "报名积分",   "amount": 50, "condition": "none" },
    { "id": "b2", "type": "course_outline", "name": "免费领资料", "kind": "article", "articleId": "<docId>", "condition": "wechat_auth" },
    { "id": "o1", "type": "course_trial",   "name": "课程权益",   "courseId": "<course docId>", "mode": "multi", "condition": "wechat_auth" },
    { "id": "o2", "type": "course_outline", "name": "文章",       "kind": "article", "articleId": "<docId>", "mode": "multi", "condition": "survey" },
    { "id": "o3", "type": "points",         "name": "额外积分",   "amount": 100, "mode": "multi", "condition": "none" },
    { "id": "o4", "type": "coupon",         "name": "优惠券",     "couponId": "<coupon docId>", "mode": "multi", "condition": "contact" }
  ]
}
```

业务规则：
- **报名不强制**：`formConfig` 字段一律降级为选填，仅作为解锁依据，不再拦截报名（H5 纯网页除外，见 §5）。
- **附加条件 `condition` 四选一**：`none`（无条件）/ `wechat_auth`（微信授权登录）/ `contact`（留联系方式）/ `survey`（回答调查问卷）。满足则奖励解锁可见/可领。
- **静默授权登录 → 无任何奖励**：静默时 `loginAuth=false` 且未填表单通道字段，仅 `condition=none` 的奖励解锁；基础权益若配置授权/问卷条件，静默用户同样拿不到。
- **发放方式 `mode`**：`single`=基础自动发放（报名积分、免费领资料），不进客户勾选菜单；`multi`=客户自选（课程权益、文章、额外积分、优惠券），C 端奖励菜单可全选/任选，回传 `chosenRewards`。
- **奖励类型**：`points`（积分）/ `course_trial`（课程权益）/ `course_outline`（资料与文章，`kind` 三选一 article/file/lesson）/ `coupon`（优惠券）。
- **向后兼容**：解锁判定 helper 对旧字段做归一化（`loginRequired`→`wechat_auth`，`channel`→对应 contact/survey），避免已配置活动的奖励失效。

### activity-signup 新增字段

- `unlockInfo`（json）：记录本次报名的解锁与领取结果。

```json
{
  "loginAuth": true,
  "channels": { "contact": true, "survey": false },
  "chosenRewards": ["b1", "b2", "o2"]
}
```

### formConfig 通道标注（可选，最小改动）

- 现有 `formConfig` 数组元素可选手动标 `channel: "contact" | "survey"`，用于「联系方式」与「调查问卷」两类字段的区分与引导展示。未标注则默认归为报名基本信息，不影响解锁。

## 4. 后端流程（signup）

微信环境且 `rewardConfig` 存在时：

1. **报名不拦截**：`formConfig` 全部选填（放宽当前"required 即拦截"逻辑；H5 纯网页除外）。
2. **解锁判定**：
   - `loginAuth`：微信授权登录（有 openid/微信公众号绑定）→ `true`。
   - `channels`：`contact` / `survey` → 按用户是否填写对应通道字段置 `true`。
   - 每个奖励按 `condition` 判定：`none`→恒真；`wechat_auth`→`loginAuth`；`contact`/`survey`→`channels[condition]`。
3. **奖励裁剪**：仅保留「已解锁」的奖励；`mode=single` 直接自动领取，`mode=multi` 交由前端自选后回传 `chosenRewards`。
4. **建 signup 记录**：写入 `unlockInfo`。
5. **逐项自动发放**（每项独立幂等键 `act:{docId}:{uid}:{rewardId}`）：
   - `points` → `earnPoints(action=activity_reward)`，**金额走 override 定款，不靠配死的 rule**。
   - `course_trial` → 复用已有 `grantCourseTrial`。
   - `course_outline` → 按 `kind` 分发：`article`→`preUnlockArticles` 授权 / `file`→记录下载链接供前端领取 / `lesson`→`grantCourseTrial`。
   - `coupon` → `zhao-deal` 的 `coupon-collection` 领券。
6. **通知**：`act_confirm` 模板照发（依赖关注公众号，不强制）。

非微信/H5 纯网页：维持电话必填，不展示条件/授权登录分组。

## 5. 前端流程

### 5.1 C 端报名引导（pages/activity/detail.vue）

改造报名入口为分步引导，步骤如下：

- **H5 纯网页**：电话为必填（沿用现逻辑，不分组）。
- **微信环境**，点「立即报名」→
  1. **Step1 登录方式**：静默 vs 微信授权登录。授权登录文案介绍好处（模板通知 + 获得积分）；选授权且无头像 → 提示完善/补头像。静默 → 仅 `condition=none` 的奖励可见。
  2. **Step2 信息解锁**：有联系方式（contact 通道字段）则引导填，有问卷（survey 通道字段）则引导填；两者都有 → 二选一先做、做完再引导另一个；都没有 → 跳过直接结束。
  3. **Step3 奖励菜单**：`mode=single` 显示为「自动发放」；`mode=multi` 由客户勾选（全选/任选）。
  4. **Step4 确认报名**：提交后端完成报名与自动发放，回传 `chosenRewards`。

> 现有实现使用 `r.loginRequired` + `r.channel` 过滤解锁奖励，需改为按 `r.condition` 判定。

### 5.2 web 管理端奖励配置（pages/activity/form.vue，新增）

在活动编辑表单中新增「报名奖励配置」区块（当前管理端无 rewardConfig 编辑能力，需新增）：

- **启用开关**：`loginEnabled`。
- **信息通道**：`infoChannels`（留联系方式 / 回答调查问卷），可勾选启用。
- **奖励列表编辑器**：每项配置
  - 类型：积分 / 课程权益 / 资料与文章 / 优惠券
  - 名称、发放方式（基础自动 single / 客户自选 multi）、附加条件（无条件 / 微信授权 / 留联系方式 / 回答调查问卷）
  - 类型参数：积分→数量；课程权益→课程；资料与文章→kind+文章/文件/课时；优惠券→优惠券
  - 支持新增 / 删除 / 上移下移。

## 6. 边界与风险

- **幂等**：signup 已有重复校验；奖励逐项用 dedupe key，重复点击/重复回调不重复发放。
- **补发**：`unlockInfo` 记录可支撑管理端手动补发；本次不实现，仅留字段。
- **模板通知关注限制**：需用户默认关注公众号，后端 `sop` 已做降级不断链，前端仅提示。
- **大纲三种资源**：奖励项 `kind` 三选一（article/file/lesson），分别接文章授权/文件链接/课时课程授权，不新增 content-type。
- **条件向后兼容**：`condition` 归一化 helper 兼容旧 `loginRequired`/`channel`，已配置活动不失效。
- **server 依赖约束**：不新增 package.json dependencies；改动集中在 `zhao-point` 插件 schema（加 json 字段）与 service，插件需本地重建 dist 随仓库提交。

## 7. 涉及的改动范围

- `basic/plugins/zhao-point/server/src/content-types/activity/schema.json`：加 `rewardConfig` json。
- `basic/plugins/zhao-point/server/src/content-types/activity-signup/schema.json`：加 `unlockInfo` json。
- `basic/plugins/zhao-point/server/src/services/activity.ts`：解锁判定改为 `condition` 归一化 + 按条件过滤；signup 流程放宽必填 + 奖励发放（含类型分发的 helper）。
- `basic/plugins/zhao-point/server/src/services/form.ts`：表单收集支持字段 `channel` 标注（如需要）。
- `shao/pages/activity/detail.vue`：报名分步引导解锁过滤改为 `condition`（登录方式/信息解锁/奖励菜单）+ 按环境分流。
- `shao/services/api.ts`：`signupActivity` 支持回传 `chosenRewards` 与读取 `unlockInfo/rewardConfig`（已实现，核对契约）。
- `web/src/pages/activity/form.vue`（新增）：报名奖励配置区块（`rewardConfig` 编辑 UI）。
