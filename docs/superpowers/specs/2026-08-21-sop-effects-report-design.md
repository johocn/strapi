# SOP 触达漏斗效果报表设计

> 阶段：自动化进阶 · 最小闭环：SOP 效果报表（触达漏斗）

## 1. 背景与目标

`sso-sop.trigger` 依据 `sop-rule` 生成消息任务（`sso_msg_jobs`），用于活动后运营等触达。当前**没有按场景聚合的效果视图**，运营无法判断各 SOP 场景的触达量、送达率与频控拦截情况。本特性提供面向运营的**触达漏斗报表**：按场景（作业归属单元）聚合发起/送达/失败/频控拦截 + 累计点击，支撑 SOP 效果审视。

本期**只做触达漏斗**（zhao-sso 内数据现成），**不含跨系统业务转化**（报名/评价/复购）——转化归因单独一期。

## 2. 设计决策（已确认）

| 决策点 | 结论 |
| --- | --- |
| 统计范围 | 触达漏斗（`sso_msg_jobs` 聚合），不含业务转化归因 |
| 统计单元 | **以 `scene` 为单元**（`sso_msg_jobs` 仅带 `scene`，job 归属唯一）；行内附关联 sop-rule 列表 |
| 点击口径 | 展示关联模板各版本 `clickCount` **累计值**，标注"累计" |
| 接口 | zhao-sso 新增 `GET /admin/msg/sop-stats`（scope `sso.msg.read`） |
| 前端 | web 运营端新增页 `src/pages/msg/sopStats.vue`（时间 + scene 筛选 + 表格 + 汇总卡片） |
| 时间口径 | 统一以 `sso_msg_jobs.created_at ∈ [from,to]` 过滤（覆盖全状态，缺省近 30 天） |

## 3. 关键约束与口径

- **job → rule 归属**：`sso_msg_jobs.scene`（string）匹配 `sso_sop_rules.scene`。同 `scene` 可配多条规则，故报表行按 `scene` 去重统计，行内展示该场景全部关联规则（code/name/templateCode/source）。避免按规则逐行导致的重复计数。
- **时间过滤**：统一用 `created_at`（job 创建时）落在 `[from,to]`（含端点）。`sentAt` 仅作行内信息展示，不作为过滤主键（`pending/quota_limited/cancelled/failed` 无 `sentAt`）。
- **状态口径**：
  - `total`：区间内该 scene 全部 job 数
  - `sent`：`status='sent'`
  - `failed`：`status='failed'`
  - `quotaLimited`：`status='quota_limited'`
  - `pending`：`status='pending'`
  - `cancelled`：`status='cancelled'`
  - `sentRate` = `sent / max(total,1)`（整数百分比）
- **clicks（累计）**：该 scene 关联 `sop-rule.templateCode` → `msg-template(code)` → 其全部 `msg-template-version` 的 `clickCount` 累加。为累计值，非区间值，前端标注"累计"。

## 4. 接口契约

`GET /api/zhao-sso/v1/admin/msg/sop-stats?scene=&from=&to=`（scope `sso.msg.read`）

Query（全可选）：
- `from`：ISO 日期/时间，缺省 = now - 30 天
- `to`：ISO 日期/时间，缺省 = now
- `scene`：精确过滤单个场景；缺省 = 全部

Response `200`：
```json
{
  "from": "…", "to": "…",
  "summary": {
    "sceneCount": 3,
    "total": 120, "sent": 90, "failed": 15,
    "quotaLimited": 10, "pending": 5,
    "sentRate": 75
  },
  "rows": [
    {
      "scene": "activity.closed",
      "rules": [{ "code": "act_revisit", "name": "未到场挽回", "templateCode": "act_revisit_tpl", "source": "event" }],
      "total": 60, "sent": 45, "failed": 8, "quotaLimited": 5, "pending": 2, "cancelled": 0,
      "sentRate": 75,
      "clicks": 12
    }
  ]
}
```
错误：无 scene 且无有效数据时仍返回 `{summary, rows:[]}`，不报错；非法 `from>to` 返回 `400`。

## 5. 统计逻辑（zhao-sso 新 service `sso-stats.ts`）

```
@strapi service getSopStats({ from, to, scene }):
  毫秒校验 from<=to（否则 throw 400）
  rules = sso_sop_rules.findMany({}) // 全量，取 scene + 首条 rule 信息
  jobs = sso_msg_jobs 按 scene(可选) + created_at ∈ [from,to] + status 分组 count
  rows = 对出现的 scene（无场景筛选：取全部 scene 集合；有筛选：仅该 scene）:
     scene, rules(该 scene 第一条及以上 rule 对象), 各状态计数, sentRate, clicks
  clicks: 该 scene rules 的 templateCode → msg-template(code) → msg-template-version 的 clickCount 求和
  summary = 对 rows 求和
```

实现要点：
- 复用 `strapi.db.query`（别经 documents，用底层 query 聚合计数）。
- `clicks` 用 `msg-template-version`（`template` 关联）`findMany` 后按 template.code 匹配 `templateCode` 累加 `clickCount`。
- 无匹配记录的 scene 不产生行（列表来自实际 job 或 scene 过滤）。

## 6. 前端（web 运营端）

新页 `e:\code\web\src\pages\msg\sopStats.vue`：
- 顶部：时间范围（起/止日期 picker，默认近 30 天）+ scene 输入筛选 + 查询按钮
- 汇总卡片：总发起 / 送达 / 失败 / 频控拦截 / 送达率
- 表格列：scene、关联规则（code/name/templateCode）、total、sent、failed、quotaLimited、pending、sentRate、clicks（标注"累计"）
- 调用 `/api/zhao-sso/v1/admin/msg/sop-stats`，头带 web 侧 token

## 7. 验收要点（accept-sop-stats.cjs）

1. 构造 1 条 sop-rule + 关联模板/版本（clickCount 已知）+ 若干 job（覆盖 sent/failed/quota_limited/pending/cancelled，created_at 分布在过去 30 天内外）
2. 默认（近 30 天）聚合：断言 summary/rows 各计数与 sentRate 正确
3. `from`/`to` 收缩区间：区间外 job 被排除
4. `scene` 筛选：只返回该 scene
5. `from>to` 返回 400
6. `clicks` 为该 scene 关联模板版本 clickCount 累计
7. 清理零残留：删除测试 sop-rule/模板/版本/user/job，断言无残留