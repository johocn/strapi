# 活动分享海报 + 裂变 设计文档

> 日期：2026-08-21
> 状态：已确认（用户决策，逐步收敛）

## 目标

在活动详情页提供「活动分享海报 + 裂变分享」能力：用户可将活动生成一张带邀请二维码的海报图保存并转发，或通过微信 JS-SDK 分享给好友/朋友圈，新用户扫码打开详情页后自动落入分享者名下（客户归属）。

**范围边界**：纯前端实现，后端零改动。全部复用现有能力（邀请码 / 分享链接 / 二维码 / 微信分享），不新增依赖、不新增表、不新增接口。

## 架构

```
活动详情页 detail.vue
  ├─ 入口按钮「分享海报」
  ├─ 海报弹层：
  │     drawActivityPoster()  → canvas 绘制（品牌底 + 标题 + 时间/场地 + 推荐语 + 二维码）
  │     二维码内容 = 当前详情页 URL + ?inviteCode=<getInviteCode()>
  │     canvas.toDataURL() → 预览 + 保存到相册（H5 走 <a download>）
  │     微信分享：setPageShare({title, desc, imgUrl, pageUrl})
  └─ 关闭/取消
```

## 技术栈

- shao（uni-app H5 端）：detail.vue、`utils/activity-poster.ts`（新增）、`UQRCode`（已有）、`setPageShare` / `getInviteCode` / `appendInviteCode`（已有）
- 无后端改动、无新依赖

## 组件与职责

### 1. 后端：无改动
- activity.detail 已返回活动全部信息（title / venueName / startTime / endTime / description / capacity）
- 邀请码、分享 URL、二维码、微信签名均由前端现有工具提供

### 2. `shao/utils/activity-poster.ts`（新增，纯函数，职责单一）
纯 canvas 绘制函数，输入活动对象 + 二维码内容，输出绘制完成的 canvas / dataURL。不耦合 uni 生命周期，便于单测。

```
export function drawActivityPoster(canvas, activity, qrcodeText): void
export function renderActivityPosterDataURL(activity, qrcodeText): string  // H5 端返回 dataURL
```

布局（纵向 750×1200 设计稿，canvas 实际尺寸取 2 倍 1500×2400 保清晰）：
- 背景：品牌渐变（复用 detail.vue 现有 `#667eea → #764ba2` 主色，顶部渐变 + 底部深色陪衬）
- 顶部：品牌落款（站点名，取 authConfig?.shareTitle 前缀 或 固定文案「胜林在线」）
- 中部：活动标题（大号加粗）、时间、场地（带图标或分隔线）
- 中下部：二维码（UQRCode 绘制，白色底边距）
- 底部推荐语（如「扫码报名，一起参加！」）
- 分发维度：二维码内容固定只含 `shareUrl`，底部可再印一句人工文案

### 3. `shao/pages/activity/detail.vue`（改动核心）
- **模板**：在 `action-bar` 上方新增入口按钮/区域「分享海报」（link 样式，不在 action-bar 容器内以不与报名/签到冲突）；新增海报弹层 `<view v-if="posterVisible">`，内嵌 `<canvas>` + 预览图 + 「保存到相册」/「微信分享」按钮 + 关闭
- **script**：
  - 引入 `drawActivityPoster` / `renderActivityPosterDataURL`
  - `buildShareUrl()`：复用 `appendInviteCode` 给当前 `window.location.href` 附加 `inviteCode=getInviteCode()`
  - `showPoster()`：设 `posterVisible=true`，`nextTick` 后画 canvas（二维码内容 = buildShareUrl）→ 生成 dataURL 展示预览
  - `savePoster()`：H5 用 `a.download`（查 canvas 为 blob 降级 dataURL）；`#ifndef H5` 走 `uni.saveImageToPhotosAlbum`
  - `wxShare()`：调用现有 `setPageShare({ title: activity.title, desc: 简短介绍, imgUrl: 预览图/默认分享图, pageUrl: buildShareUrl() })`（复用 `wx-jssdk.ts`，好友+朋友圈，签名走既有接口 mock 预留）
- **style**：海报弹层样式（全屏半透明遮罩 + 底部弹层 / 居中卡片）、入口按钮样式
- 现有 `generateQrcode` 的 UQRCode canvas 画法保持不变，抽一个共用 helper 置于 poster.ts 供两处复用

## 数据流

1. 用户打开活动详情 → 点击「分享海报」
2. 前端：`shareUrl = appendInviteCode(window.location.href, getInviteCode())`
3. 前端：`qrcodeText = shareUrl`，`renderActivityPosterDataURL(activity, qrcodeText)`
4. 弹层展示预览图；用户可保存到相册或触发微信分享（`setPageShare`）
5. 被分享者打开分享链接/扫码 → 详情页 URL 带 `?inviteCode=<code>` → `handleInviteLink()` 自动存储（复用现有）→ 登录/注册 `bindInviteCodesAfterLogin()` → `useInviteCode` → sso-referral-relation 客户归属（复用现有，裂变闭环达成）

## 错误处理

- 二维码生成失败（canvas 不可用）→ toast「海报生成失败」，关闭弹层
- H5 保存禁用/跨域 canvas 污染 → 提示用户改用长按保存或微信分享
- 未登录：`getInviteCode()` 返回 guest 码（现有逻辑，含生成），海报仍可生成，裂变归属在前端已有逻辑下是 guest 兜底，不阻断
- 微信分享未配置域名/签名失败 → `setPageShare` 内部已有 try/catch + 日志，静默降级为默认分享

## 测试 / 验收

- `drawActivityPoster` 纯函数：给定活动对象 + shareUrl，输出非空 dataURL（H5）
- detail 页：点「分享海报」弹层出现、二维码内容含 `?inviteCode=`、预览图渲染、保存触发下载、`setPageShare` 被调用（mock window.wx / 检查 currentPageShare 值）
- 裂变闭环回归：因纯前端复用，不新增验收脚本（已由既有 `handleInviteLink` / `bindInviteCodesAfterLogin` 流程覆盖）
- 手动：H5 端浏览器点「分享海报」→ 生成海报 → 保存/预览正常；网页微信内打开时 friend/timeline 分享配置生效（需真域名线上联调，本地 mock 预埋）

## 非目标（YAGNI）

- 不做后端分享数据接口 / 短链服务 / 分享统计埋点落库
- 不做海报自定义背景图 / 动态模板 / 配置化载体（后续可扩展为 admin 配置）
- 不做微信 JSSDK 真签名本地启用（沿用 mock 预留，线上真域名再启用）