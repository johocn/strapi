# 多媒体分发补齐方案

**日期**: 2026-10-05  
**状态**: 已确认执行  
**范围**: A 渠道补齐 + B 可靠性补齐，一气呵成

---

## 目标

修复 caps vs 实现不一致 bug、补齐 bilibili RPA 驱动、修复 FINALIZE 阶段不回写 externalId 的核心 bug。

## Phase A：渠道层

### A-BUG：PLATFORM_CAPS 与真实实现对齐

当前 `publish-adapter.ts` PLATFORM_CAPS 宣称 toutiao/xhs/douyin 都支持 video/gallery，但 channel-adapter 里 toutiao/xhs video/gallery 直接 throw、douyin 是 h5_share 不是真发。

**修复**：

| 平台 | article | video | gallery | 原因 |
|------|---------|-------|---------|------|
| toutiao | ✅ | ❌ | ❌ | RPA 框架 input 是图文设计，video 无字段 |
| xiaohongshu | ✅ | ❌ | ❌ | 同上 |
| douyin | ✅ | ❌ | ❌ | OAuth server API 只有 article；video/gallery 是 h5_share 手动扫码 |
| bilibili | ✅ | ✅ | ❌ | 本次加 RPA driver，图文专栏 + 视频上传 |
| wechat | ✅ | ❌ | ❌ | freepublish 只支持 article |
| internal | ✅ | ✅ | ✅ | 内部渠道直接更新 status |
| custom | ✅ | ✅ | ✅ | 自定义接口透传 |

### A1：bilibili RPA 驱动全链路

改动文件：

1. **rpa/types.ts** — `RpaPlatform` 加 `'bilibili'`；`RpaPublishInput` 加 `videoUrl?: string`
2. **rpa/bilibili.ts** 新建 — Playwright driver：
   - contentType 分支：`video` → `https://member.bilibili.com/platform/upload/video/frame.html`；`article` → 专栏入口
   - 表单填写：title / 封面 / 正文 / 分类标签
   - 视频上传：Playwright `setInputFiles` + `videoUrl` 先下载到临时目录
   - 提交后取页面上的 videoId/articleId 作为 externalId
   - **选择器标记 TODO：需浏览器实测**
3. **rpa/index.ts** — `DRIVERS` 注册 bilibili
4. **rpa-client.ts** — `RPA_PLATFORMS` 加 bilibili；`resolveAccountPlatform` 放行；`publishViaRPA` 透传 videoUrl
5. **channel-adapter.ts** — 加 `publishToBilibili` case，调 `rpaClient.publishViaRPA`（video 场景 input 里加 videoUrl）

### A2：douyin 保留 H5 share，caps 降级

`publishToDouyin` 的 `publish_mode='h5_share'` 逻辑不动（抖音无 server 发布 API）。但 PLATFORM_CAPS 里 douyin.video/gallery 改 false。

## Phase B：可靠性层

### B-BUG：FINALIZE 不回写

`runStage` FINALIZE case 空实现，publish-record 的 externalId/url/error 永远不落盘。

修复：FINALIZE case 加 `strapi.documents.update` 写 `externalId / url / error`。同步检查 publish.ts 的 sync fallback 路径有没有同样问题。

### B1：checkStatus 平台策略

当前只有 wechat 走轮询，其他平台 pass-through。代码已如此，加注释明确：RPA 平台 publish 成功即 final；OAuth server API 平台（wechat）需轮询确认。

### B2：失败后手动 retry

Worker processor catch 里：如果错误是幂等冲突（僵尸 record 已清理），调用 `publishQueue.enqueuePublish(publishRecordId)` 重新入队，而非 throw 触发 BullMQ 自动重试（自动重试不知道僵尸 record 已清，可能还是命中幂等）。

## 约束

- bilibili driver 选择器需真实浏览器环境实测后补准，本次先写通用占位
- RPA 运行前提：服务器需 `npm i playwright && npx playwright install chromium`，能直连 bilibili.com 创作中心
- dist 变更需 commit，Strapi 加载 dist/ 而非 src/
