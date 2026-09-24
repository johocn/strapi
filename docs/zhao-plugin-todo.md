# zhao 插件待完成事项

> 更新日期：2026-06-06
> 状态：核心代码质量已全部修复，ESLint 6条自定义规则守门（0 errors）

## 低优先级

### 1. 清理 33 个 unused-vars 警告

ESLint 扫出 33 个 `@typescript-eslint/no-unused-vars` 警告，多数是 Strapi 约定签名中的未用参数。

**修复方式**：给未用参数加 `_` 前缀（如 `strapi` → `_strapi`），删除未使用的导入和变量。

**涉及文件**：
- zhao-auth: controllers/index.ts, policies/adapter.ts, services/auth.service.ts, services/index.ts
- zhao-channel: destroy.ts, routes/content-api.ts, services/channel-permission.ts, services/channel.ts
- zhao-common: register.ts, services/error-handler.ts, services/i18n.ts
- zhao-course: destroy.ts, services/course.ts, services/lesson-progress.ts
- zhao-oss: bootstrap.ts, register.ts, services/provider-registry.ts, services/sync-service.ts
- zhao-point: destroy.ts, index.ts
- zhao-quiz: destroy.ts, services/quiz-batch.ts, services/quiz-exam.ts
- zhao-sso: services/sso-auth.ts, services/sso-user.ts
- zhao-third: services/third-party-auth.ts

### 2. 服务层 channelScope 过滤逻辑完善

各插件服务层查询时按渠道范围过滤，当前部分已实现（zhao-channel、zhao-course），其他插件待补全。

**涉及插件**：zhao-point、zhao-quiz、zhao-oss、zhao-third

### 3. sso_enabled 查询缓存优化

当前每次检查 `sso_enabled` 直接查数据库，可加内存缓存（TTL 5分钟）减少查询。

**涉及文件**：zhao-common/server/src/services/feature-flag.ts

### 4. 前端渠道筛选器组件

Admin Panel 中的渠道选择器组件，用于切换当前管理的渠道范围。

**状态**：未开始

---

## 已完成（2026-06-06）

- 9个插件编码规范统一（控制器/服务层/策略/路由）
- ESLint 6条自定义规则 + 全项目 0 errors
- 分销双写流程（ChannelSyncService: local/remote/off）
- SSO 开关（sso_enabled）
- throwErr 迁移（全项目服务层 throw new Error → throwErr）
- catch 块状态码透传（(err).status || 400）
- 控制器响应格式统一（ctx.status + ctx.body）
- 控制器零数据库调用
- 策略文件显式 return true
- 服务文件语法修复（=> ({ → => { return {）
- 路由规范统一（content-api + /v1 前缀 + as const）
- 废弃 admin.ts 路由文件清理
