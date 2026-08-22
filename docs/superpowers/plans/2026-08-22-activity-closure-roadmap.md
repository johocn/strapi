# 活动闭环剩余开发 Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 梳理线上线下活动闭环剩余待开发内容，按「分享海报补齐 → 评价/复购深化 → 部署上线收尾」三个阶段推进，每个阶段在真正开发时独立走 spec+plan。

**Architecture:** 当前活动闭环主链（报名→到场→评价→触达→复购→分配/看板）已基本落地并验收，剩余集中在三块：A) 分享海报补齐闭环缺口（唯一未实现的分享链路），B) 评价/复购运营侧深化，C) 全链路部署上线。各阶段均沿用 zhao-point/zhao-sso/zhao-course 既有 service 分层 + web 运营端 / shao C 端页面模式。

**Tech Stack:** Strapi v5、PostgreSQL、knex、uni-app H5（web 运营端 + shao C 端）、Playwright（前端冒烟）。

---

## 阶段全景（优先级自上而下）

### 阶段 A：活动分享海报补齐（最小缺口，优先）
**动机：** 分享裂变已有积分归因与裂变榜，但缺少海报图生成——分享时无法把活动信息视觉化，闭环缺口。
**本次范围：**
- 后端 `zhao-point`：海报图生成接口 `POST /my/activity/:documentId/poster`（或静态资源）→ 返回分享图（活动标题/讲师/场次时间/二维码）。二维码指向 C 端报名页并携带分享人 Invite 码（复用既有裂变归因）。海报生成可用服务端 canvas（sharp/skia 现有库）或前端 uni-app canvas 离屏生成后上传。
- 前端 web 运营端：活动详情/列表"生成海报 / 复制分享链接"入口。
- 前端 shao C 端（若需要）：报名成功页展示"保存海报分享"。

**关键点：** 海报二维码须携带分享人标识回填裂变归因；图片落库为 URL（复用既有上传通道）；需在 spec 明确海报尺寸/元素布局供前端照用。

### 阶段 B：评价/复购运营侧深化
**动机：** 活动后闭环已有评价采集（评分+NPS+文字）与复购 SOP 触发，但运营端缺乏评价管理与复购线索跟进视图。
**本次范围：**
- 评价管理 + 汇总看板：运营端按活动/系列聚合评价——评分均值趋势、NPS、文本关键词高频、评价明细列表可筛选/标记已处理。
- 复购线索跟进：活动后复购 SOP 触发名单在运营端可查、可标记跟进状态（未跟进/已跟进/已成交）。
- 复用既有 `activity-overview` 看板聚合口径与 `sop` 触发名单数据。

**关键点：** 评价汇总口径与既有 overview 看板保持一致；复购名单来源 = `zhao-sso` sop job scene（`activity.repurchase`）。

### 阶段 C：部署上线收尾
**动机：** 全部闭环已开发完毕，按约定统一部署上线。
**本次范围：**
- basic（后端）→ pull 至 shao 服务器 pm2 运行；web 运营端 + shao C 端 → HBuilder 构建产物上传 openresty 站点。
- 按记忆部署注意点执行：config 变更 `pm2 delete`+`pm2 start`；`--update-env` 重载环境变量；插件 `plugins/<name>/dist` 有效产物需提交；恢复部署时装调的 pgAdmin / swappiness。

**关键点：** 部署前对所有 accept-*.cjs 验收脚本在线上数据库跑一遍，确认新契约（share-referral/sop/quota/resource 等）在线上 schema 齐全；openresty 站点路径按记忆映射。

---

## 已落地功能参考清单（不在本轮开发范围）

避免后续重复开发，以下均已实现并有 `scripts/accept-*.cjs` 验收：
- 报名：动态报名表单、报名+签到、系列报名规则、费用分档(`feeTiers`/`feeFactors`)
- 名额：候补、候补转正、名额并发原子控制
- 排期：系列自动按周排期、忙闲/冲突检测、活动日历聚合、讲师/场地资源主档
- 触达：报名态提醒、触达频控(sso-quota)、SOP 自动化、复购SOP、微信模板消息中心
- 裂变：分享裂变归因+奖励+裂变榜
- 转化：课程 D7 归因、完课激活、续学推荐
- 成效：活动效果总览看板、SOP 效果报表
- 画像：用户画像/分层、消息 AB 测试

---

## 执行约定（apply to 各阶段验收）

- 每阶段独立走 spec → plan → subagent-driven 执行 → 验收。
- 验收脚本命名 `scripts/accept-<stage>.cjs`，覆盖端到端并清理零残留。
- 收口固定步骤：停 dev → `git restore dist/`（根 app）→ 清理临时诊断脚本 → 三仓库按记忆映射提交/推送。
- 前端改动按仓库构建方式提交（web/shao 需 `npm run build:h5` 后再提交 dist）。