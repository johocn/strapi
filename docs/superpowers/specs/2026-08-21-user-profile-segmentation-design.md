# 用户画像分层与合伙人精准客户分层 · 设计文档

- 日期：2026-08-21
- 范围：zhao-sso（画像域）+ web 管理端 + shao C 端合伙人页
- 状态：设计确认，待实施

## 1. 目标与边界

在线上线下活动闭环基础上，补齐**用户六维画像 + S/A/B/C 客户分层 + 合伙人精准客户视图**，让运营与合伙人能"看懂客户、精准跟进"。

**本期范围**
- 画像：实时聚合六维（活跃度/兴趣/阅读深度/完课率/到场意愿/付费潜力），详情页惰性计算并落库分层标签
- 分层：S/A/B/C 四档，综合打分，标签落库 `sso-user-profile`
- 管理端：全局用户画像列表（按分层筛选）+ 详情 + 批量重算
- 合伙人端：我的下线客户列表 + 客户画像详情 + 一键微信触达 + 跟进记录
- 架构：全部落在 zhao-sso（复用身份/消息/SOP 基础设施，跨应用可调用）

**不在本期**：AB 测试/模板版本、画像趋势历史、自动分层推送通知。

## 2. 数据模型（zhao-sso）

### SsoUserProfile（分层标签落库，collectionName `sso_user_profiles`）
| 字段 | 类型 | 说明 |
|---|---|---|
| user | relation→sso-user | 必填，画像主体 |
| segment | enumeration [S,A,B,C] | 分层等级 |
| segmentScore | integer | 综合分 0-100 |
| segmentReason | text | 分层理由（一句话，含亮点/短板） |
| dimensions | json | `{ activity, reading, completion, attendance, payment }` 各 0-100；`interests: [tag1, tag2, tag3]` |
| lastCalculatedAt | datetime | 最近计算时间 |

### SsoFollowUp（跟进记录，collectionName `sso_follow_ups`）
| 字段 | 类型 | 说明 |
|---|---|---|
| partner | relation→sso-user | 跟进人（分销上级），必填 |
| customer | relation→sso-user | 被跟进下线，必填 |
| content | text | 跟进内容/备注，必填 |
| status | enumeration [todo,done,cancelled] | 默认 todo |
| nextFollowAt | datetime | 下次跟进时间（可选） |

## 3. 画像聚合与分层算法（service `sso-profile`）

### 六维聚合（实时，跨插件直查同库）
| 维度 | 数据源 | 打分口径 |
|---|---|---|
| activity 活跃度 | zhao_lesson_progresses(lastStudyAt)、zhao_website_visit_logs、point 签到 | 近 30 天行为频次归一化 0-100 |
| reading 阅读深度 | visit-log type=article_view + dwellTime/scrollDepth | 文章阅读次数 + 平均停留/滚深 |
| completion 完课率 | lesson-progress isCompleted/isCorrect | 完成课时占比 + 答题正确率 |
| attendance 到场意愿 | activity_signups（含 attendedAt） | 报名数 + 到场率加权 |
| payment 付费潜力 | course-enrollment enrollType(paid/points)、积分兑换 | 付费/积分购课次数 + 兑换数 |
| interests 兴趣 | 课程分类 / 文章分类 / 活动类型 | 频次 top3 标签 |

### 分层打分
```
总分 = completion*0.25 + payment*0.25 + activity*0.20 + attendance*0.15 + reading*0.15
S ≥ 80 / A ≥ 60 / B ≥ 40 / C < 40
```
`segmentReason` 由 max/min 维度自动生成一句话（如"完课率高+有付费记录，阅读偏弱"）。

### 服务方法
- `calculateProfile(ssoUserId)`：实时聚合 → 打分 → 返回完整画像（不落库）
- `getProfile(ssoUserId)`：调用 calculateProfile 并落库 `sso-user-profile`（惰性计算）
- `recalcAll()`：遍历 up_users → 桥接 sso-user → 逐个 getProfile 落库（管理端批量预热）

## 4. 接口设计

### 管理端 admin（权限：`menu.sso-msg` 下新增 `sso.profile.read` / `sso.profile.write`）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/zhao-sso/v1/admin/profiles | 用户画像列表（search/segment 筛选、分页；展示已落库分层） |
| GET | /admin/profiles/:ssoUserId | 画像详情（实时计算并落库） |
| POST | /admin/profiles/recalc-all | 批量重算全量（需 sso.profile.write） |

### 合伙人端 partner（C 端 sso 登录态，policy 校验 inviter↔invitee）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/zhao-sso/v1/partner/my-customers | 我的下线客户列表（含分层标签） |
| GET | /partner/customers/:id | 下线客户画像详情（校验归属） |
| POST | /partner/customers/:id/touch | 一键触达（templateCode/params → sso-msg.sendNow） |
| GET/POST/PUT | /partner/follow-ups | 跟进记录 CRUD（仅本人 partner） |

## 5. 前端页面

### web 管理端
- `pages/sso/profile/list.vue`：画像列表（搜索/分层筛选/徽标/分数/兴趣）
- `pages/sso/profile/detail.vue`：六维条形 + 分层理由 + top3 兴趣 + 重算按钮
- dashboard SSO 区新增「用户画像」入口

### shao C 端合伙人
- `pages/partner/customers.vue`：我的客户列表 + 分层徽标
- `pages/partner/customer-detail.vue`：六维 + 触达（选模板）+ 跟进记录
- 入口：存在 referral-relation(inviter) 时显示

## 6. 风险与边界

- **身份桥接**：画像落 sso-user，但学习/积分/活动数据挂 up_user；详情计算时需 sso→up 反向匹配（复用 resolveSsoUserForUpUser 逻辑反向：按 username/email/mobile 匹配 up_users，匹配不到显示"无行为数据"）
- **跨插件查表**：直查各插件 UID 表（同库允许），需确认插件 content-type 已注册（zhao-course/zhao-point/zhao-website/zhao-channel）
- **列表性能**：列表不实时计算，只读已落库标签；未计算用户显示"待计算"，由详情/recalc-all 补齐
- **合伙人越权**：partner 接口必须校验 referral-relation（inviter=当前用户 且 invitee=目标），否则 403
- **触达幂等**：复用 sso-msg.sendNow 的 dedupeKey（scene+customer），防重复骚扰

## 7. 验收口径

1. 管理端画像列表可筛选 S/A/B/C；详情六维与分层理由正确；recalc-all 全量落库
2. 有分销下线的用户（如测试合伙人）登录 C 端可见「我的客户」；列表含分层徽标
3. 客户详情六维展示；一键触达生成 pending 消息任务（mock 通道）
4. 跟进记录增删改查仅本人可见；越权访问其他合伙人下线返回 403
5. 无行为数据用户画像各维为 0、分层为 C，不报错
