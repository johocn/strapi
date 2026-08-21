# 课程 D7 转化归因设计

> 阶段：自动化进阶 · SOP 触达/复购场景 · 课后 D7 转化（与活动复购归因同构增量补齐）

## 1. 背景与目标

复购转化归因（`getRepurchaseStats`）已落地活动侧：衡量「活动复购触达 → 用户真的再次报名」。课程侧已有 `course_d7` 课后 SOP（`course.enrolled` 后按 1/3/7 天排期，scene=`course.d7`，模板 `course_d7`），但**没有对应转化归因**，运营看不到「课程触达 → 用户再报新课」的拉动效果。本轮补齐，口径与活动复购归因完全一致。

## 2. 本轮范围

- **课程 D7 转化归因报表**：纯查询（不落库），在 `sso-stats` 新增 `getCourseD7Stats`，复用活动复购的模式。
- **归因源**：仅 `scene=course.d7` 的已送达触达 job。
- **前端**：web 运营端新增「课程转化归因」页（复用 `repurchase.vue` 模式）。

**不在本轮**：触达 A/B、复杂归因模型（多触点/时间衰减）、其余场景归因；不新增任何 courses 侧埋点。

## 3. 判定模型（已确认）

- 转化行为 = **触达后再报名其他课程**（`course-enrollment` 新建且 `status='enrolled'`）。
  - 注：`course_d7` 是对用户已购课的课后 SOP，窗口中新建的 `enrolled` 报名天然是另一门课，无需排除触发课程。
- 窗口起点 = **触达送达时间** `job.sent_at`；
- 窗口长度 = `conversionWindowDays`（sop-rule，scene=`course.d7`，可空默认 **7 天 = D7**）。
- 判定：某送达 job → sso-user → `resolveUpUserForSsoUser` → upUser → 该 upUser 在 `(touchAt, touchAt+window]` 内新增 `course-enrollment`（`status='enrolled'`）→ 记为转化。

## 4. 数据源

- `sso_msg_jobs`（scene=`course.d7`, status=`sent`, sent_at ∈ [from,to]）
- `sop-rule`（scene=`course.d7` 的 `conversionWindowDays`，复用既有字段，不新建配置表）
- `sso-profile.resolveUpUserForSsoUser`（sso → upUser 桥接）
- `plugin::zhao-course.course-enrollment`（`user` manyToOne，`status` enum 含 `enrolled`，`enrolledAt` datetime）

## 5. 接口（zhao-sso 新增）

`GET /api/zhao-sso/v1/admin/msg/course-d7-stats?from=&to=`（scope `sso.msg.read`）

Response `200`：
```json
{
  "from": "…", "to": "…",
  "windowDays": 7,
  "summary": {
    "sent": 120,           // 区间内送达的 course.d7 触达 job 数
    "convertedUsers": 18,  // 窗口内再报新课的独立 upUser 数
    "conversions": 21,     // 窗口内新建 enrolled 报名条数（1 用户可多次）
    "conversionRate": 15   // round(convertedUsers / sent * 100)
  }
}
```

实现：在 [msg-stats.ts](file:///e:/code/basic/plugins/zhao-sso/server/src/controllers/msg-stats.ts) 新增 `courseD7Stats` handler，在 [admin.ts](file:///e:/code/basic/plugins/zhao-sso/server/src/routes/admin.ts) 注册路由，在 [sso-stats.ts](file:///e:/code/basic/plugins/zhao-sso/server/src/services/sso-stats.ts) 新增 `getCourseD7Stats`（结构对齐 `getRepurchaseStats`）。

## 6. 统计口径与边界

- `sent` = `sso_msg_jobs`(scene=course.d7, status=sent, sent_at∈[from,to])
- 同一 upUser 多条触达：converted 去重；conversions 按 enrollment 条数计
- `from > to` → 400；无数据返回 `{summary: 全 0/0%}`，不报错
- 性能：送达 job 量大时逐 user count×有 N+1 风险，沿用活动归因的方式（先取 job 列表，按 upUser 聚合，窗口内 count），不引入缓存/落库
- 不新增 dependencies，全部复用现有 zhao-sso/zhao-point/zhao-course/strapi 能力

## 7. 验收标准

`scripts/accept-course-d7.cjs` 覆盖：预插 sso users 桥接 + course_d7 送达 job + 窗口内/外报名样本，断言 `sent/convertedUsers/conversions/conversionRate`，`from>to` 400，无数据全 0，并确保清理零残留。