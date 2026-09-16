# 任务 3 设计：周边游活动（复用线下活动体系）

**日期:** 2026-09-16
**状态:** 待审阅

## 背景与目标

在现有线下活动体系（zhao-point 插件）基础上增加「周边游」活动类型（1-2 天短途游），**尽量复用已有模块与功能**：活动模型、报名、费用、签到、台账、留言、分享、积分、宣传页组件体系。

## 用户决策记录

- 行程形态：**1-2 天短途游**（含过夜），行程 D1/D2 多站，含出发/返回日期、集合地点、成团人数
- 报名单位：**按人报名**（复用 activity-signup，零改动）
- 费用模式：**复用费用体系**（pointsCost 积分抵扣 + cashPrice 现金 + feeTiers 阶梯，周边游以现金价为主）
- 展示形态：**复用活动宣传页 + 新增行程模块**（promo 组件体系），不做独立旅游专题页

---

## 一、复用盘点（零改动清单）

| 模块 | 复用方式 |
|---|---|
| 活动模型 `activity` | `type="周边游"`（type 为 string，新值即可） |
| 报名 `activity-signup` | 按人报名，`activity` 关联不变，`formData` 可承载个性化字段 |
| 费用体系 | `pointsCost` / `cashPrice` / `feeTiers` / `pricingMode` 全部复用 |
| 签到/台账/留言/分享/积分 | 全部继承（activity-attendance / activity-ledger / activity-message / activity-share-visit / activity-referral-reward） |
| 出发/返回日期 | 复用 `startTime`（D1 出发）/ `endTime`（D2 返回） |
| 行程数据 | 复用 `itinerary` JSON（type=周边游时按行程结构解析，与剧本游 order 结构互不干扰） |
| 宣传页 | promo 组件体系 + `promoModules` 配置化挂载 |

## 二、新增（最小集）

### 2.1 后端 activity schema 新增字段（全部可空，存量活动不受影响）

`plugins/zhao-point/server/src/content-types/activity/schema.json` 新增：

| 字段 | 类型 | 说明 |
|---|---|---|
| `meetupPoint` | string | 集合地点（如「人民广场地铁站 1 号口」） |
| `minParticipants` | integer, default 0 | 成团人数（0=不限制，仅展示提示，不联动活动状态） |
| `costIncludes` | text | 费用包含（如「往返大巴 + 景区门票 + 1 晚住宿 + 2 正 1 早」） |
| `costExcludes` | text | 费用不含（如「个人消费、旅游意外险」） |

**`itinerary` 行程结构约定**（type=周边游时）：

```json
[
  { "day": 1, "title": "集合出发", "stops": [
    { "time": "08:00", "title": "集合出发", "desc": "人民广场集合，大巴出发" },
    { "time": "10:00", "title": "游览古村", "desc": "漫步百年古村" }
  ]},
  { "day": 2, "title": "返程", "stops": [
    { "time": "09:00", "title": "早餐后自由活动", "desc": "可选自费项目" },
    { "time": "13:00", "title": "返程", "desc": "返回市区" }
  ]}
]
```

解析规则：`type === '周边游'` 时按 `day/stops` 结构渲染；剧本游（`tourMode=true`）仍按 `order` 结构，互不干扰。后端活动详情/列表接口透传 `itinerary`/新字段（确认现有接口已透传全部字段，如缺失则补）。

### 2.2 C 端宣传页（web 仓库）

**新增组件 `src/components/promo/promo-tour.vue`**（行程模块，props: `activity` + `config`）：
- D1/D2 多站时间线（day 分组 + 每站 time/title/desc）
- 集合地点（meetupPoint，有值则显示）
- 成团提示：`minParticipants > 0` 时显示「满 N 人成团，已报名 M 人」（M 取 `usedCapacity`，`usedCapacity >= minParticipants` 时显示「已成团」）
- 费用包含/不含（costIncludes/costExcludes，有值则显示，配色用现有 promo 变量）

**`src/pages/activity/promo-presets.js`**：`PROMO_MODULE_META` 追加：

```javascript
  tour: { name: '行程安排', needConfig: true },
```

**`src/pages/activity/promo.vue`**：
- import `PromoTour`，预览区 `v-else-if="m.type === 'tour'"` 挂载
- 模块配置区新增 tour 配置表单（参考 agenda 配置区模式）：
  - 集合地点（输入）
  - 成团人数（数字输入，0=不限）
  - 费用包含 / 费用不含（多行文本）
  - 行程编辑：D 分组（day 序号 + 标题），每 D 内 stops 列表（time/title/desc），支持增删行
- 活动类型为「周边游」时（form.type === '周边游'）推荐位展示 tour 模块

### 2.3 管理端活动列表

`src/pages/activity/list.vue`（或既有列表页）：活动标签显示 `type`（含「周边游」），无需新逻辑（type 已展示）；如现有列表有类型筛选则确认「周边游」可筛。

## 三、不做（YAGNI）

- **成团状态联动**：未成团自动取消/延期——仅展示提示
- **多人一单报名**：家庭/团组批量报名
- **独立旅游专题页**：多线路集合 + 筛选
- 周边游专用签到/台账流程（如景区打卡点签到）

## 四、兼容与风险

- **Schema 兼容**：新字段全部可空，Strapi 自动建列，存量活动（剧本游/讲座/沙龙等）不受影响
- **itinerary 语义隔离**：解析严格按 `type === '周边游'` 分支，剧本游代码（`activity.ts` 606-691 行 tourMode 逻辑）零改动
- **宣传页兼容**：tour 模块仅新增，不改变现有 13 个模块行为；非周边游活动不添加 tour 模块
- **费用展示**：复用 `feeText(form)` 现有逻辑（cashPrice/pointsCost 组合），周边游现金价 > 0 时正常显示

## 五、验证

1. 后端：schema 新字段建列成功（生产 `\d activities` 验证）；活动详情接口返回新字段
2. 管理端：活动 type=周边游 → 宣传页编辑出现「行程安排」模块 → 添加配置（行程/集合点/成团/费用说明）→ 预览渲染正确
3. 宣传页：行程时间线、集合地点、成团提示（未成团/已成团）、费用包含不含正确显示；报名按钮走现有流程
4. 回归：剧本游活动宣传页行程（itinerary 剧本站点）不受影响；其他类型活动无 tour 模块
5. 报名验证：周边游报名成功 → 台账/签到/留言流程正常
