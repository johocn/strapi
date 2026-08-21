# 首期·活动报名 + 到场签到 · 设计文档

日期：2026-08-20
状态：已确认（第1~4节评审通过）
范围：首期最小闭环「线上活动报名 → 线下到场签到 → 签到积分 → 解锁活动专属学习包」+「报名前置预留存」

## 1. 背景与总目标
在现有平台（课程系统 zhao-course、GEO文章 zhao-website、积分 zhao-point、渠道 zhao-channel、认证 zhao-auth）之上，补齐"线下活动域"，形成
`GEO引流 → 线上报名 → 到场转化 → 现场留存 → 课后持续学习 → 积分锁粉 → 合伙人画像赋能` 的长期商业闭环。

本设计文档只覆盖**首期**（活动报名+到场签到），其余子系统（消息触达/自动化SOP/六维画像/合伙人分层/活动↔文章↔课程自动打通）在"分阶段路线图"中记录，不在本期实施。

## 2. 首期范围（已确认）
- 免费活动 + 名额限制 + 报名/取消
- H5 报名（C端）+ 管理后台活动 CRUD（管理端）
- 报名成功 → 前置预留存：自动解锁 `preUnlockArticles`(GEO文章) + `preUnlockLessons`(课程试看) + 发报名积分
- 到场签到双通道：
  - 二维码核销（H5出码 → 后台摄像头扫码核销，method=worker_scan）
  - 用户自助（H5"我已到场"，method=self；活动可配置是否启用地理强控：开启则按 radius 校验经纬度，关闭则任意位置可签）
- 签到 → 发 `activity_attend` 积分 + 解锁活动专属学习包(articles+lessons)
- 管理后台：活动CRUD、报名名单、扫码核销、签到记录、CSV导出
- 渠道归属：活动归属到渠道，非本渠道管理员不可见（沿用 channelScope）

## 3. 架构落点与数据模型
落点：扩 **zhao-point**（已确认）。用 `activity-*` 命名空间 + service 分层隔离"活动"与"纯积分"逻辑，沿用现有 `redemption/sign-in/point` 分层风格。

新增 3 个 content-type（均 `plugin::zhao-point`）：
- `activity`
  - 信息：title、description、startTime、endTime
  - 场地：venueName、lat、lng
  - 名额：capacity；报名起止：signupStart、signupEnd
  - 签到：checkinMode(`worker_scan|self|both`)、geoEnforced(bool)、geoRadiusM
  - 预留存/学习包：preUnlockArticles(relation→article)、preUnlockLessons(relation→lesson)、learningPackageArticles(relation)、learningPackageLessons(relation)
  - 状态：`draft|signup_open|ongoing|ended`；渠道归属：channelScope/channelIds（沿用现有）
- `activity-signup`
  - user、activity、status(`active|cancelled`)、signupAt、attendedAt
- `activity-attendance`
  - signup、method(`worker_scan|self`)、checkinAt、lat、lng、geoPassed(bool)、pointsGranted(bool)

跨插件协作（**单向依赖，防循环**）：zhao-point 的 activity service 只允许依赖 → `zhao-website`(文章授权) / `zhao-course`(课时权限) / `zhao-common`(站点配置)；这三个不反向依赖 activity 逻辑。

## 4. 流程时序
1. 报名（C端提交）→ `activity-service.signup(activityId)`
   - 事务：校验名额(已用<capacity)&报名窗口&非重复 → 原子更新已用名额 → 创建 signup(active) → 成功
2. 预留存（报名同请求内）：授权 preUnlockArticles/preUnlockLessons → `earnPoints(action='activity_signup')`
3. 到场签到（双通道任选）：
   - 扫码核销：H5报名页出二维码 → 后台扫 → `checkin({code, method:'worker_scan'})`
   - 用户自助：H5"我已到场" → 若 geoEnforced →上传经纬度→与活动坐标距离≤geoRadiusM才算通过；否则任意位置可签
4. 签到落库+激励（同一事务）：创建 attendance → 更新 signup 已到场 → `earnPoints(action='activity_attend')` → 授权 learningPackage
5. 幂等/限额：报名幂等(active去重)，签到幂等(每活动一次)，activity_attend 按活动单次

## 5. 积分配置（zhao-point point-rule）
- `activity_signup`：报名发放，一次性
- `activity_attend`：到场发放，每活动一次
预留存/专属包授权可重入（重复调用无副作用），积分由报名/签到各触发一次，不重复发放。

## 6. 管理后台（web）
- 活动管理：CRUD + 上下架 + 名额实时（已报/上限）；场地/经纬度/geoEnforced/radius；签到策略；预留存与专属包选择
- 报名名单：用户/报名时间/状态(`已报名|已取消|已到场`)/签到方式/签到时间；筛选 + CSV导出
- 扫码核销（现场）：调起摄像头扫H5码 → 展示报名信息 → 确认核销；成功/重复/未报名即时反馈
- 签到记录：到场明细、地理校验结果、积分发放状态
- 权限：沿用 zhao-auth role-gate；活动经营角色可 CRUD，现场核销角色仅名单+核销；渠道范围沿用 channelScope

## 7. C端页面（shao）
- `/pages/activity/list`（列表，进行中/全部，名额进度）
- `/pages/activity/detail?id=`（信息/报名取消/签到/二维码/预留存与专属包入口）
- `/pages/activity/my`（我的报名）
- 首页/个人中心挂入口

## 8. 风险点
- 名额并发防超卖：报名用事务内原子占位，不引悲观锁（2G部署约束）
- zhao-point 变大：靠 activity-* 命名 + service 分层守边界
- 地理强控精度：H5 GPS 在室内不稳定，geoEnforced 默认关闭由活动方决定
- 二维码核销依赖摄像头 + H5 码；shao 已有 uqrcodejs 可复用

## 9. 分阶段路线图（后续阶段规划，本期不做）
- 阶段2：消息触达（短信/公众号模板/企微，需外部供应商，单独确认）+ 到场前提醒
- 阶段3：自动化 SOP / 定时任务（未到场回访、课后7天留存 SOP）
- 阶段4：六维用户画像 + 合伙人后台客户分层/跟进线索
- 阶段5：活动↔课程↔文章↔积分深度自动打通 + 未到场自动标签

## 10. 验收（Playwright 走查）
见实施计划的验收清单：报名幂等、预留存/积分即时生效、双通道签到、地理强控通过/拒绝、重复签到幂等、名单/CSV、渠道隔离。