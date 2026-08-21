# 课程完课转化归因 + 激活SOP 设计

> 日期：2026-08-21 ｜ 方向：课程运营深化（第二环）
> 前置：课程 D7 转化归因已完成（2026-08-21-course-d7-attribution）

## 背景与目标

课程侧已有报名埋点（`course.enrolled` 触发 `course.d7` 课后提醒）与学习进度/完课埋点（`course-progress`、`lesson-progress`）。但缺少两个运营能力：

1. **完课转化归因**：D7/激活触达后，用户是否真正把课学完——衡量“提醒是否促成完成”。
2. **激活 SOP**：对报了名却长期不开课/进度低的用户，做周期性醒学提醒，沉淀到 `course.activate` 场景可供频控与报表。

最小闭环 = 完课归因报表 + 激活催学定时任务，前后端 + 验收一次收口。

## 数据模型变更（zhao-course 插件）

### course-progress 新增两个 datetime 字段

| 字段 | 类型 | 说明 | 写入时机 |
| --- | --- | --- | --- |
| `completedAt` | datetime | 首次完课时间戳 | `recalculate` 中幂等写入：`isCompleted` 由 false→true 且 `completedAt` 为空时写当前时间 |
| `lastReminderAt` | datetime | 上次醒学提醒时间 | 激活SOP触发**且真实生成任务**后回写（见 Part 2） |

不迁移历史数据；历史完课记录 `completedAt` 为空，不被纳入窗口完课统计（可接受）。

## Part 1 完课转化归因

### 判定模型
- **触达源**：`scene ∈ {course.d7, course.activate}` 的已送达任务（`status=sent`、`sentAt ∈ [from,to]`）。
- **窗口**：以每条触达 `sentAt` 为起点，`windowDays` 天（从 `course.d7` 规则 `conversionWindowDays` 读取，缺省 7）内该业务用户**任一 `course-progress.isCompleted && completedAt ∈ (sentAt, sentAt+window]`** 计为转化。
- 单位口径：一条触达 = 一个已送达样本；样本人群中发生完课的计 `conversions`（条数，一条触达可对应多条完课），去重用户计 `convertedUsers`。`conversionRate = convertedUsers / sent`。
- **纯查询不落库**，用户桥接与 D7 一致：`resolveUpUserForSsoUser(ssoUserId)` 拿 up_user。

### 接口
- `sso-stats.getCourseCompletionStats({ from?, to? })` → `{ from, to, windowDays, summary: { sent, convertedUsers, conversions, conversionRate } }`
- 控制器 `msg-stats.courseCompletionStats`
- 路由 `GET /v1/admin/msg/course-completion-stats`，scope `sso.msg.read`
- 入参校验：`from > to` 返回 400。

### 前端（web 运营端）
- `src/pages/msg/courseCompletion.vue`：日期筛选 + 四张汇总卡（送达/转化用户/转化条数/转化率）+ 窗口天数说明文案。
- `pages.json` 注册，标题「课程完课转化」。

## Part 2 激活SOP

### 触发条件（全部满足才提醒）
1. `course-enrollment.status = enrolled` 且 `enrolledAt ≤ now - 3天`；
2. 该用户+课程不存在 `course-progress`，或 `progress < 30`（含 `totalLessons=0` 未开课），且 `isCompleted=false`；
3. 距上次催学 ≥ 7 天：`lastReminderAt` 为空 或 `≤ now - 7天`；且近期无学习：`lastStudyAt` 为空 或 `≤ now - 7天`。

### 执行
- zhao-course 新增 `server/src/config/cron.ts`，每日一次（`"0 8 * * *"`）。
- 调 `course-progress` service 新增方法 `runActivationReminderScan()`：
  1. 按批次查 enrolled 报名记录（带 user、course）；
  2. 逐条判定上述条件；
  3. 命中则 `sso-sop.resolveSsoUserForUpUser(userId)` 桥接，匹配到才 `sso-sop.trigger("course.activate", { user: sso.id, payload: { course:{title} } })`；
  4. 仅当 `trigger` 返回结果非空（确有规则/模板生成任务）才回写 `lastReminderAt=now`——无规则时不压制，避免配置缺失导致永久不催。

### 防骚扰
- 场景冷却由已有 `sso-quota` 兜底（`course.activate` 冷却默认 ≥7 天）；
- 叠加业务去重：`lastReminderAt` + `lastStudyAt` ≥7 天才再催；
- 任务推送字段与 D7 复用同一套消息服务，幂等由 `sso-msg` 保证。

## 风险与约束
- **插件 dist 需重建**：改 zhao-course 源码（schema/service/cron）+ zhao-sso（sso-stats）后必须 `cd plugins/<name> && npm run build`，dev 才加载新产物，否则新接口/字段 404。
- **无历史 `completedAt`**：存量完课不计入转化，报表从有触达的新数据开始积累，可接受。
- **cron 入口**：Strapi 自动加载 `server/src/config/cron.ts`；5 字段 cron 表达式。

## 验收标准
- `scripts/accept-course-completion.cjs`：
  - 造 enrolled 报名 + 学习进度数据，构造 `course.d7` / `course.activate` 送达任务；
  - 断言 `completedAt` 幂等写入、窗口内/外完课判定、触达源两场景汇总、未绑定 sso 跳过；
  - 验证 `runActivationReminderScan` 命中/不命中去重、无规则不回写 `lastReminderAt`；
  - 清理零残留 + `git restore dist/` 收口。