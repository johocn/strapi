# 活动系列 + 排期管理 设计

> 阶段十二 · 活动运营上位化。延续活动报名/候补/海报，引入「活动系列」分组与「自动按周排期」。

## 背景

当前 `plugin::zhao-point.activity` 是扁平 collection 实体，无「系列」概念，无法把同一运营主题下的多次场次（如训练营第 1~8 期）组织在一起，也无法便捷地周期性生成排期。本设计引入：

- **活动系列** `activity-series`：一种运营分组实体，承载系列元信息 + 排期规则。
- **场次归系列**：`activity.belongsToSeries`（manyToOne，可空）。
- **一键复制**：以任一在场次为模板复制为草稿（复基本信息/预解锁，重置报名与时间）。
- **自动按周排期**：series 携带 `schedule` JSON 规则，手工批量预生成 + 访问时滚动惰性生成，共用同一生成引擎，绝不重复生成。

## 数据模型

### 新内容类型 `activity-series`（plugin::zhao-point）

```
collectionName: activity_series
kind: collectionType
draftAndPublish: false

attributes:
  title:        string, required
  description:  text, 可空
  cover:        string(media url 或 http url), 可空
  sortOrder:    integer, default 0, 用于系列排序
  status:       enumeration [active, hidden], default active  # hidden 不对外展示但保留场次
  schedule:     json, 可空, 自动按周排期规则（结构见下）
```

`schedule` JSON 结构：
```json
{
  "weekdays": [1, 3, 5],        // 周几，1=周一 ... 7=周日（与 JS Date.getDay() 一致）
  "startTime": "19:00",         // 每场开始时间 HH:mm
  "durationMin": 90,            // 每场时长（分钟），生成 endTime = startTime + durationMin
  "generateWeeks": 8            // 滚动惰性生成到「未来第 N 周」（relative to today 所在周）
}
```

### `activity` 追加关联

```
belongsToSeries:  relation oneToMany(inverse manyToOne) -> plugin::zhao-point.activity-series, 可空
```

场次关联到系列，系列下可查多条场次。

## 后端（plugin::zhao-point）

### 系列 CRUD（admin）

- 沿用现有 `content-api.ts` 路由口径：`channelScopeRoute("<method>", "/adm/series...", "<controller>.<handler>", "series.<action>")`，前缀落到 `/api/zhao-point/v1/adm/series` 系列（与 `/adm/activities` 一致），鉴权走 `plugin::zhao-auth.*` policies（is-authenticated / has-permission / has-channel-scope / has-tenant-access，见 `adminRoute`/`channelScopeRoute` 定义）。
- `POST /` 建系列；`GET /`(分页+title 模糊筛)；`GET /:documentId`；`PUT /:documentId`；`DELETE /:documentId`（删除系列不级联删场次，`belongsToSeries` 置空；未发布草稿场次若属该系列也可保留并解绑）。
- 服务 `series-service`：`find/create/update/delete`。

### 场次归系列 + 一键复制

- 活动编辑时传 `belongsToSeries`（管理的活动 BODY 增加该字段透传）。
- `POST /api/zhao-point/v1/adm/activities/:documentId/duplicate` → `activity-service.duplicate(documentId)`：
  - 读取源活动字段，复制：`title`（追加「（副本）」）/ `type` / `description` / `venueName` / `lat` / `lng` / `capacity` / `signupStart` / `signupEnd` / `checkinMode` / `geoEnforced` / `geoRadiusM` / `channelScope` / `channelIds` / `belongsToSeries` / `preUnlockArticles` / `preUnlockLessons`。
  - 重置：`startTime`/`endTime` 置空、`usedCapacity = 0`、`status = draft`、报名关系清空（created 新报名为空关系即可）。
  - 返回新活动 documentId。

### 自动按周排期引擎（series-service.generateSchedule）

统一生成方法，两个触发共用，绝不重复：
```
generateSchedule(seriesDocumentId, { count? })
```
- 锚点：`今天` 所在周的周一为基准，逐周向后扫描，对每一周内 `schedule.weekdays` 逐一匹配。
- 候选日期 = 周基准 + (weekday-1) 天；候选 `startTime` 由 `schedule.startTime` 决定。
- 查重：该 series 下是否已存在 `startTime` 日期相同的场次（按 `activity.startTime` 的本地日期+该 schedule 唯一时间 匹配）——已存在则跳过该候选（不回填、不重复）。
- `count` 有值：生成满 `count` 场停止（手工批量预生成）。
- `count` 无值：扫描到「当前周 + generateWeeks 周」为止（滚动惰性补齐）。
- 生成的场次：`title = series.title`、`type` 保留系列当前值或默认、`description` 取 series.description、`startTime` = 候选日期 + schedule.startTime、`endTime` = +durationMin、`status = draft`、`usedCapacity = 0`、`belongsToSeries` = 本系列、`capacity` 继承系列下最近一场或默认 100。
- 幂等/竞态：生成前再次按 series+startTime 查重，避免并发重复。

### 触发

- **手工批量**：管理端系列详情页「生成排期」按钮，POST `/api/zhao-point/v1/adm/series/:documentId/generate?count=N` → `generateSchedule(id, {count})`，返回本次新生成场次数。
- **滚动惰性**：C 端 GET `/api/zhao-point/v1/series/:documentId`（public 详情）时，若 series.schedule 存在 → 调 `generateSchedule(id)` 补齐到 generateWeeks 周。C 端详情只返回**已发布可报名**场次（status in [signup_open, ongoing]，按 startTime asc）——滚动生成的 draft 场次对 C 端不可见，不进任何列表/场次数统计。
- 不做独立 cron 定时任务（访问时惰性触发，零新服务）。

### C 端接口

- `GET /api/zhao-point/v1/series`（public）：status=active 的系列列表（含场次数）。
- `GET /api/zhao-point/v1/series/:documentId`（public）：系列详情（title/description/cover）+ 其下全部**已发布可报名**场次（status in [signup_open, ongoing]，按 startTime asc），并触发滚动生成。
- 活动详情响应附加：`series`（所属系列摘要）+ `seriesActivities`（同系列其他场次列表）。

## 前端 shao（C 端）

### 新增 `pages/activity/series.vue`
- 传入 series 的 documentId。
- 顶部：系列封面（有则显）/标题/简介。
- 下方：场次卡片列表（startTime/场地/报名状态/剩余名额/报名按钮）。
- 每卡可跳对应 activity detail / 直接报名。
- 空场次展示占位文案。

### `pages/activity/detail.vue`
- 顶部若 activity.series 存在：显示系列名 chip → 点击跳 `series.vue`。

## 前端 web（管理端）

### 新增「活动系列」菜单页（api/series + pages/series）
- 系列表格：title/场次数/状态/操作。
- 系列编辑表单：title/description/cover/status/sortOrder。
- 系列详情：该系列场次列表（每行含「复制」按钮 → duplicate）。
- 系列排期设置：schedule 编辑（按周几多选 + startTime + durationMin + generateWeeks）。
- 系列详情页「生成排期」按钮 → count 输入 → generate。

### 活动编辑页
- 表单新增「所属系列」下拉（选择 activity-series）。
- 活动列表/场次列表行新增「复制」按钮 → duplicate。

## 验收

- `scripts/accept-series.cjs`：
  1. admin 登录。
  2. 系列 CRUD（建 → 改 → 查 → 删）。
  3. 建两场活动归同系列。
  4. duplicate 断言：title 含「（副本）」、usedCapacity=0、status=draft、startTime/endTime 空、belongsToSeries 相同、preUnlock 关系复制。
  5. schedule 手工生成：设 weekdays 排期 → generate?count=3 → 断言生成 3 场、日期符合周几、endTime=start+duration。
  6. 重复调用 generate → 不新增场次（幂等去重）。
  7. C 端系列详情返回场次列表（触发滚动生成到 generateWeeks）。
  8. 清理零残留。

## 边界（不做）

- 不回填历史缺失周（滚动只向前补齐，跳过已存在）。
- 不实现「系列模板自动 cron 排期」（滚动走访问惰性，无独立定时服务）。
- 不做跨系列规则继承、不做系列封面轮播/分享。
- `activity` 无积分字段——序列不涉及积分；预解锁内容以 `preUnlockArticles/preUnlockLessons` 为准并随复制拷贝。

## 冲突/风险

- **关系复制**：duplicate 时 manyToMany 预解锁关系需用 connect 传入新实体，避免源关系误连。
- **去重时间口径**：按 `startTime` 的本地日期 + schedule.startTime 判重，注意时区（统一用服务端项目时区）。
- **行为查重热路径**：系列详情每次请求触发 generate，需在 generate 内二次查重保幂等；生成的 draft 对 C 端不可见、不造成 `### 场次数` 污染（场次数统计只计非 draft 或按需）。