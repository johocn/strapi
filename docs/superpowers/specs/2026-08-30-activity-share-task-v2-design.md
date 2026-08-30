# 转发任务升级 · 分享裂变 v2 设计文档

> 一期已上线（activity_share 规则 5分/日4次/30min冷却、share-guide 好友/朋友圈示意图、海报分享静默领分、活动邀请裂变、我的邀请页）。本期在**运营端任务卡配置**与**分享转发防刷/触发**上做升级。

## 一、背景与目标

- 现状：任务中心「分享活动」卡片只有一行 description，枯燥；分享链接不可手动复制；无法区分分享形式；冷却纯按时间。
- 目标：
  1. 运营端可给任务卡配 **图标 / 名称 / 描述**，并可选任务链接（文章/课程/活动），选中后自动把内容**图片、标题、描述**带入任务字段（可再改）。
  2. 任务链接自带**邀请码归因**，用户可**一键复制**。
  3. 分享触发：先弹分享引导（好友/朋友圈示意图 + 复制链接），再跳转到任务链接对应内容页。
  4. 领分触发 = **复制链接成功** 或点 **「我已分享」**。
  5. 防刷冷却改为有实际意义：**有好友点击链接进入站点 + 距上次>=30分钟**方可再领；**次日自动解锁**。
  6. 运营端规则记录 **>5 条时加搜索**（按名称/action）。

## 二、需求拆解

### R1 任务卡运营端配置（新增字段 + 表单）
数据层（point-rule schema）新增：
- `name`（string，任务标题，可空 → 兜底用 action 可读化）
- `icon`（string，图标；存 emoji 短码 或 图片 URL）
- `linkType`（enum: article / course / activity / none）
- `linkTargetId`（string，内容 id）
- `linkTitle` / `linkThumb`（辅助，冗余存选中内容标题与封面图，便于 C 端直接展示，不用每次回查）

运营端 rules.vue：
- 编辑表单新增「任务标题 name」「图标 icon」(emoji/图片二选一)。
- 新增「选择任务链接」：选类型(文章/课程/活动) → 打开内容选择器 → 列表>5条显示搜索框(按标题搜) → 选中一条 → 自动回填 icon(封面)、name(标题)、description(内容描述)，**允许修改**。
- 规则列表记录 >5 条时顶部显示搜索框（按 name/action/description 过滤）。

### R2 分享链接复制 + 归因
- share-guide 弹窗新增「复制分享链接」按钮：生成带当前用户 `inviteCode&inviterId` 的落地 URL（按任务 linkType 拼对应内容页路由），`uni.setClipboardData` 复制。
- 复制成功 → 视为一次完成（领分）。

### R3 分享交互流程（C 端）
- 任务卡 →「去分享」→ 弹 share-guide（好友/朋友圈示意图 + 复制链接按钮）→ 用户点「复制」或「我已分享」→ 领 activity_share 积分 → 关闭 → 跳转任务链接对应内容页（linkType+linkTargetId）。
- 无任务链接(none)时，跳转兜底活动页。

### R4 防刷冷却改造（核心）
现状 `cooldownRemainingMs` 纯按最后成功记录时间。改为：
- 解锁条件（二选一满足）：
  - **有好友点击链接进入站点**（访客点击埋点记录到 `activity_share_visit`）且距上次成功分享 >= 30 分钟。
  - **次日自动解锁**：距上次成功分享已跨自然日。
- 实现：新增 `hasShareVisitSince(userId, sinceTime)` 与次日判断，替换现有纯冷却。

### R5 访客点击埋点（新增记录点）
- 现状：好友登录后才 `useInviteCode` 绑定，未登录访客点击记录不到。
- 新增：落地页入口（H5 加载时读 inviteCode/inviterId）调用 `POST /v1/my/point/share/visit`，记录 `activity_share_visit`（guestId 可空、inviterId、targetType、attemptId 去重、createdAt）。**无需登录**，用于冷却解锁信号。
- 若未登录访问，埋点仍记录；inviter 从 URL 的 inviterId / inviteCode 反查。

## 三、数据模型变更
- point-rule（zhao_point_rules）新增字段：`name`、`icon`、`linkType`、`linkTargetId`、`linkTitle`、`linkThumb`。
- 新增 content-type：`activity_share_visit`（访客点击埋点），字段：inviter(rel→user，可空)、targetType、targetId、attemptId(string 去重)、createdAt。
- 已有 `activity-referral-reward` 不变。

## 四、接口
| 接口 | 方向 | 说明 |
|---|---|---|
| `POST /v1/my/point/share/visit` | C→B | 访客点击归因埋点，无需登录，幂等 |
| `GET /v1/my/tasks` | C→B | 任务列表返回新增 name/icon/linkType/linkTargetId 等 |
| 运营端 point-rule CRUD | web→B | 支持新字段 |

## 五、C 端文件改动
- `pages/tasks/tasks.vue`：卡片渲染加 icon+name+描述；「去分享」→ share-guide 增强；领分成功跳转内容页。
- `components/share-guide/share-guide.vue`：新增「复制链接」+「我已分享」+ 跳转回调。
- `pages/activity/detail.vue`：我的邀请入口已在；打卡/海报领分保持。
- 新 `API` 方法：`reportShareVisit`、`copyShareLink`、跳转路由按 linkType 分发。

## 六、验收标准
1. 运营端能配任务 name/icon/链接，选择内容自动回填可改；>5条时搜索可用。
2. 任务卡展示 图标+名称+描述。
3. 点「去分享」→ 弹引导 → 「复制链接」或「我已分享」→ 领 5 分（30min 冷却/日4次仍生效）。
4. 冷却解锁：无好友点击时次日才解锁；有好友点击后 30min 可再领。
5. 复制出的链接带邀请码+邀请人，落地页跳正确（文章/课程/活动）。

## 七、非目标 / 风险
- H5 无法真实验证「已发好友/朋友圈」，仅以「复制成功/我已分享」近似，防刷靠冷却+上限。
- 访客埋点依赖落地页 H5 加载时 URL 带参；分享到非网页渠道时信号缺失 → 次日兜底解锁。
- 新字段需对已初始化库补列（同 activity_share 规则 seed 教训），上线前需 migration/upsert。