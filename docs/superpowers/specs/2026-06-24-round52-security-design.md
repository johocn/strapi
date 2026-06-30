# 第 52 轮：安全加固与合规修复

## 背景

前 51 轮已完成约 304 处修复。本轮聚焦三个安全/合规方向：
1. 渠道范围过滤（跨渠道数据泄漏）
2. soft-delete 白名单（任意内容类型删除风险）
3. C端 profile.vue 合规修复

## 任务 1：渠道范围过滤

### 现状
- `zhao-auth` 已提供 `has-channel-scope` policy（非阻断，注入 `ctx.state.channelScope`）
- `zhao-common` 的 `adminRoute` 仅挂载 `is-authenticated` + `has-permission`，未挂载 `has-channel-scope`
- `config.ts` 控制器的 `getThird`/`getSso` 直接透传 `ctx.query`，无渠道过滤

### 改造范围（仅 zhao-common）

**路由层** [content-api.ts](file:///e:/code/basic/plugins/zhao-common/server/src/routes/content-api.ts)：
- `adminRoute` 追加 `has-channel-scope` policy

**控制器层** [config.ts](file:///e:/code/basic/plugins/zhao-common/server/src/controllers/config.ts)：
- `getThird`：读取 `ctx.state.channelScope`，`all=false` 时注入 `filters.site = { channels: { id: { $in: channelIds } } }`
- `getThirdOne`/`updateThird`/`deleteThird`：查到记录后校验其 `site.channels` 与 scope 交集，无交集返回 403
- `getSso`/`getSsoOne` 等：zhao-sso 插件不存在，服务层已返回空，跳过

**不改造**：
- `getSite`/`updateSite`：按 `ctx.state.siteId` 定位单站点，siteId 由 site-resolver 中间件注入，已隔离
- `getPoints`/`getOss`：全局配置，非渠道维度数据
- 其他业务插件（course/quiz/point）的列表接口：超出本轮范围，后续轮次处理

### 边界
- `channelScope.all=true`（admin）→ 不过滤
- `channelScope.all=false` 且 `channelIds=[]` → 返回空列表
- `third-party-config` 无 site 关联 → 不过滤（兼容旧数据）

## 任务 2：soft-delete 白名单

### 现状
[soft-delete.ts:3-4](file:///e:/code/basic/plugins/zhao-common/server/src/services/soft-delete.ts#L3-L4) 的 `resolveUid` 接受任意 contentType，可删除任意内容类型。

### 改造

在 `soft-delete.ts` 顶部定义白名单（基于 schema 扫描，仅包含实际有 `deletedAt` 字段的内容类型）：

```typescript
const SOFT_DELETE_WHITELIST = new Set([
  "plugin::zhao-tag.tag",
  "plugin::zhao-tag.knowledge-point",
  "plugin::zhao-quiz.quiz-exam",
  "plugin::zhao-quiz.quiz-batch",
  "plugin::zhao-quiz.quiz",
  "plugin::zhao-course.user-course-auth",
  "plugin::zhao-channel.channel",
  "plugin::zhao-course.course-lesson",
  "plugin::zhao-course.course-category",
  "plugin::zhao-course.course",
  "plugin::zhao-point.point-type",
  "plugin::zhao-point.point-rule",
  "plugin::zhao-point.point-redemption",
  "plugin::zhao-point.point-product",
  "plugin::zhao-point.pickup-location",
]);
```

在 `softDelete`/`restore`/`findDeleted` 三个方法中，`resolveUid` 后校验：
```typescript
if (!SOFT_DELETE_WHITELIST.has(uid)) {
  const e: any = new Error(`contentType "${uid}" 不支持软删除`);
  e.status = 400;
  throw e;
}
```

## 任务 3：C端 profile.vue 合规修复

### 现状
- [profile.vue:259](file:///e:/code/shao/pages/profile/profile.vue#L259) `agreeTerms = ref(true)` → 合规风险（用户未阅读即默认同意）
- [profile.vue:345-361](file:///e:/code/shao/pages/profile/profile.vue#L345-L361) `sendCode` 为 mock，伪造"验证码已发送"

### 改造
- `agreeTerms` 默认 `false`
- `sendCode` 改为提示"短信服务未配置，请联系管理员"，不进入倒计时

### 不改造
- SMS 端点：zhao-auth 无此服务，属新功能开发，超出本轮范围

## 风险点

1. **渠道过滤误伤**：`third-party-config` 的 `site` 关系可能为空（旧数据），过滤后不可见。需保留无 site 关联的记录。
2. **白名单遗漏**：新增内容类型需手动加白名单。通过 `getSoftDeleteModels` 的 `plugin::zhao-` 前缀限制已降低风险。
3. **profile.vue sendCode**：当前 mock 本就不可用，改造影响为零。

## 验证

- 渠道过滤：非 admin 用户调用 `GET /v1/admin/config/third` 仅返回其渠道关联站点的三方配置
- 白名单：调用 `POST /v1/admin/soft-delete/plugin::users-permissions.user/:id` 返回 400
- profile.vue：打开页面，协议默认未勾选；点击发送验证码提示未配置
