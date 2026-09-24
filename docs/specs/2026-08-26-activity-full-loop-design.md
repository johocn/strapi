# 活动全链路补齐设计方案

> 日期：2026-08-26
> 范围：发布 → 报名/签到 → 评价 → 复购 → 引导学习 → 归档 全链路
> 方案定位：全链路补齐 + 懒加载状态流转（零新增依赖）

## 1. 背景与现状卡点

活动状态机：`draft → signup_open → ongoing → ended → archived`（archived 可双向）。

| 环节 | 现状 | 卡点/缺失 |
| --- | --- | --- |
| 发布 | adminCreate(draft) → adminUpdate 改 status 即发布 | 无独立发布审计；无状态自动流转 |
| 报名/签到 | signup 校验 signup_open；checkin 触发收费/解锁/授权 | 到点不自动切状态，C 端"报名中"但报错；签到窗口无自动关闭 |
| 评价 | POST /activities/:id/review 写 signup.rating/nps/review；adminReviews 聚合 | **C 端无公开评价展示/聚合评分**；无审核/隐藏 |
| 复购 | closeActivity 延迟发 act_repurchase；series chip | 依赖手工 adminClose；ended 页无"下一场/相关"推荐；无再次报名路径 |
| 引导学习 | 报名解锁 preUnlock*；签到授权 learningPackage* + grantCourseTrial | **C 端无已解锁学习内容入口**，学习包"沉睡" |
| 归档 | adminArchive/Unarchive 改 status，C 端列表过滤 | 无归档标识；无收尾策略 |

核心结论：**无 cron、无自动结束判定**（[activity.ts](file:///e:/code/basic/plugins/zhao-point/server/src/services/activity.ts#L715-L716) 明示），评价引导/复购/回访/快照全部被卡在手工 `adminClose`。

## 2. 设计原则

- 零新增依赖：不引入 cron / Redis / 新包，符合 2G 内存服务器部署约束
- 懒加载判定：状态流转挂在现有读路径上，"读到才流转"，结合聚合 drain + 启动 drain 兜底
- 不建新表：评价继续使用 signup 记录（+ reviewHidden 布尔字段）
- 最小变更：归档不清理数据，仅标识与过滤

## 3. 模块设计

### A. 状态自动流转（P0，懒加载判定）

**目标**：`signup_open→ongoing→ended` 自动流转，`closeActivity` 收尾自动触发。

**实现**：activity service 新增 `ensureTransitions(activityId?)`

- 单条判定：
  - `signup_open && now ≥ startTime` → `ongoing`
  - `ongoing && now ≥ endTime` → `ended`，执行现有 `closeActivity` 收尾（评价引导/复购/回访/快照）
- 批量 drain：`status ∈ {signup_open, ongoing} && endTime < now` 统一收尾
- **挂载点（现有读路径）**：
  1. `activity.detail` / `promoDetail`（单条惰性流转）
  2. `mySignups`（个人维度）
  3. `adminList` / `activity-stats.overview`（管理端聚合批量 drain）
  4. `bootstrap` 启动 drain 一次（兜底历史积压）

**幂等**：
- 仅 `ongoing→ended` 执行收尾（status 前置校验）
- `closeActivity` 内通知已有 `dedupeKey`、快照 `generateAutoIfAbsent`，天然防重

**风险点**：
- 懒加载是"读到才流转"，无人访问的历史活动滞留 ongoing，靠管理端聚合 + 启动 drain 兜底
- 不引入 cron，接受实时性取舍

### B. C 端评价展示（P1）

**目标**：新用户决策有口碑参考，形成"评价→转化"闭环。

**实现**：
- 后端：
  - 新增公开接口 `GET /activities/:documentId/reviews`：返回公开评价列表 + 聚合（均分/评价数/NPS）
  - `detail` 聚合返回 `ratingSummary`（均分/评价数）
  - signup schema 新增 `reviewHidden` 布尔字段（默认 false），adminReviews 支持隐藏/恢复
  - 展示条件：`rating != null && reviewHidden != true`
- C 端：detail 页新增"学员评价"区块（聚合星级 + 评价列表），报名/未报名均可看

**风险点**：历史 signup 无 reviewHidden → 默认 false 兼容；评价可见性由管理端管控

### C. 引导学习入口（P1）

**目标**：签到授权的学习包/课程不"沉睡"，用户可见可访问。

**实现**：
- 后端：`GET /my/activity/:documentId/learning` 返回该用户在本活动已解锁的文章/课时（含所属课程 + trial 授权状态）
- C 端：
  1. detail 页（已签到/ended）显示"学习资料包"区块：文章、课时、课程跳转
  2. my.vue 增加"已解锁学习内容"聚合入口
- 复用 `preUnlock*`/`learningPackage*` 关系 + `grantCourseTrial`，零新依赖

**风险点**：课程跳转需 zhao-course C 端课程详情路由参数（课时 documentId）；需确认课程详情页 URL 约定

### D. 复购推荐（P2）

**目标**：ended 后用户有直接"下一场/相关活动"入口，变被动为主动。

**实现**：
- detail 页 ended 状态新增"继续学习/下次活动"推荐卡片：
  - 优先同 `belongsToSeries` 的可报名场次
  - 其次同 `category` 的 `signup_open` 活动
  - 点击直达报名
- 后端复用现有 `list`（series/category 过滤已具备），无新接口

**风险点**：无系列/无同类时区块隐藏；排除当前活动自身

### E. 归档收尾（P2）

**目标**：归档活动 C 端有明确标识，历史可查不混乱。

**实现**：
- `detail` 对 `archived` 活动返回 `archived: true`，C 端显示"已归档"角标
- 归档不清理数据（ledger/快照/评价保留为历史审计），仅列表过滤（已具备）
- 可选：归档前确保已执行 closeActivity 收尾（若未收尾先收尾再归档）

**风险点**：需确认运营是否希望归档即不可见（当前 detail 直接访问仍可见，保持）

## 4. 接口清单

| 方法 | 路径 | 类型 | 说明 |
| --- | --- | --- | --- |
| GET | /activities/:documentId/reviews | 公开 | 评价列表 + 聚合 |
| GET | /my/activity/:documentId/learning | 注册用户 | 已解锁学习内容 |
| GET | /activities/:documentId | 公开（增强） | detail 聚合 ratingSummary + archived 标识 |
| GET | /adm/activity-reviews | 管理（增强） | 支持 reviewHidden 隐藏/恢复 |

## 5. 数据变更

- activity-signup schema 新增 `reviewHidden`（boolean，默认 false）

## 6. 不纳入范围

- 不引入 cron 定时任务
- 不新增独立评价表 / 学习进度表
- 不改动积分规则与收费引擎
- 不做归档数据清理/迁移

## 7. 风险与兜底

- 懒加载流转实时性：由管理端聚合 + bootstrap 启动 drain 兜底
- 评价可见性：reviewHidden 默认 false 兼容历史数据
- 课程跳转依赖：与 zhao-course 确认 C 端课程详情路由
