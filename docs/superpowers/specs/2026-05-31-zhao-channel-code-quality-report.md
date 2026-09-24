# zhao-channel 代码质量评估报告

**评估日期**：2026-05-31
**评估范围**：`e:\code\plugins\zhao-channel\server\src`（31 个 .ts 文件，3,298 行）
**核心目标**：安全可用、稳定可靠、解耦

---

## 1. 概览

| 维度 | 状态 | 关键发现 |
|------|------|---------|
| 安全性 | 🟡 中等 | SQL 注入风险低，但输入校验几乎为零，controller 直接透传用户输入 |
| 稳定性 | 🟡 中等 | Redis 降级完善，但 service 层错误处理不一致，部分核心路径缺 try-catch |
| 解耦度 | 🔴 偏高 | `any` 类型密度 1.9%，zhao-auth 强依赖无降级，bootstrap 职责过重 |
| 可维护性 | 🔴 偏高 | channel.ts 754 行，6 个函数圈复杂度 >10，register() 197 行 |

---

## 2. 安全性评估

### 2.1 指标数据

| 指标 | 结果 | 状态 |
|------|------|------|
| SQL 注入风险 | 全部使用 `db.query({ where: { field: value } })` 参数化查询 | 🟢 低 |
| 输入校验覆盖率 | 0/45 个 controller 入参点有独立校验 | 🔴 高 |
| 权限策略覆盖 | content-api 19 条路由全部有策略，admin 26 条路由全部有策略 | 🟢 低 |
| 敏感信息泄露 | 日志输出用户 ID（`用户 ${result.id}`），无密码/token 泄露 | 🟡 中 |

### 2.2 问题清单

**P0-SEC-1：Controller 层无输入校验**

所有 controller 方法直接将 `ctx.request.body` / `ctx.params` / `ctx.query` 透传给 service，无任何 validate/joi/zod 校验。

涉及文件（45 个入参点）：
- [channel.ts](file:///e:/code/plugins/zhao-channel/server/src/controllers/channel.ts) — 15 个入参点
- [channel-member.ts](file:///e:/code/plugins/zhao-channel/server/src/controllers/channel-member.ts) — 8 个入参点
- [channel-permission.ts](file:///e:/code/plugins/zhao-channel/server/src/controllers/channel-permission.ts) — 3 个入参点
- [user-invite.ts](file:///e:/code/plugins/zhao-channel/server/src/controllers/user-invite.ts) — 6 个入参点

Service 层有部分手动校验（如 `if (!data.name)`），但分散且不一致，无法保证所有入口都被覆盖。

**P1-SEC-2：日志输出用户 ID**

[bootstrap.ts:68-69](file:///e:/code/plugins/zhao-channel/server/src/bootstrap.ts#L68) — `strapi.log.info(\`[zhao-channel] 自动为用户 ${result.id} 创建个人渠道\`)`

生产环境日志中包含用户 ID，可能违反隐私合规要求。

**P2-SEC-3：content-api 路由 auth: false**

[content-api/index.ts](file:///e:/code/plugins/zhao-channel/server/src/routes/content-api/index.ts) — 所有 19 条路由 `auth: false`，认证通过 `channel-auth` 中间件实现。这是设计选择（三层路由架构），但意味着 Strapi 内置的 JWT 认证不生效，完全依赖自定义中间件。

---

## 3. 稳定性评估

### 3.1 指标数据

| 指标 | 结果 | 状态 |
|------|------|------|
| 错误处理覆盖率 | service 层 23 处 `const error = new Error()` + 26 处 try-catch，但核心 service 方法覆盖率约 60% | 🟡 中 |
| 外部依赖降级 | Redis 全部降级（lazyConnect + retryStrategy:null），Bull Queue 延迟初始化+降级 | 🟢 低 |
| zhao-auth 降级 | bootstrap 中有 try-catch 降级，但 channel-auth 中间件无降级 | 🔴 高 |
| 测试质量 | 175 个集成测试，含边界用例，但无单元测试 | 🟡 中 |

### 3.2 问题清单

**P0-REL-1：channel-auth 中间件 zhao-auth 依赖无降级**

[channel-auth.ts:3](file:///e:/code/plugins/zhao-channel/server/src/middlewares/channel-auth.ts#L3) — `const authService = strapi.plugin("zhao-auth").service("auth")` 无 try-catch。若 zhao-auth 插件未加载，此处直接抛异常，导致所有 content-api 路由 500。

对比：[bootstrap.ts:86-200](file:///e:/code/plugins/zhao-channel/server/src/bootstrap.ts#L86) 中 zhao-auth 调用有 try-catch 降级。

**P1-REL-2：Service 层错误处理不一致**

channel.ts 的 `create`/`update`/`delete`/`register` 方法使用 `const error: any = new Error()` + `error.status = 400` + `throw error` 模式，而 `find`/`findOne`/`getNetwork` 等方法无错误处理。

channel-permission.ts 的 `grantChannelsToUser`/`grantChannelsToRole` 无 try-catch，数据库操作失败直接抛出未封装错误。

**P1-REL-3：register() 方法 197 行，含用户注册+渠道创建+成员创建，任一步骤失败无回滚**

[channel.ts:438-634](file:///e:/code/plugins/zhao-channel/server/src/services/channel.ts#L438) — `register()` 方法中先创建用户、再创建渠道、再创建成员，但只有 `delete` 方法使用了 `strapi.db.transaction()`，`register()` 没有。用户创建成功但渠道创建失败时，会留下孤立用户记录。

**P2-REL-4：无单元测试**

所有 175 个测试都是集成测试（需要 Strapi 实例 + PostgreSQL），运行时间 74 秒。无轻量级单元测试覆盖 service 层逻辑。

---

## 4. 解耦度评估

### 4.1 指标数据

| 指标 | 结果 | 状态 |
|------|------|------|
| 插件间硬依赖 | `strapi.plugin("zhao-auth")` 2 处（bootstrap + channel-auth），`strapi.plugin("zhao-channel")` 30 处（内部自引用） | 🟡 中 |
| `any` 类型密度 | 64 处 `as any / : any` / 3,298 行 = 1.9% | 🟡 中 |
| 模块职责边界 | channel.ts 754 行，bootstrap.ts 243 行（含 3 个策略注册 + 队列处理 + 生命周期钩子） | 🔴 高 |
| 循环依赖 | 无循环依赖 | 🟢 低 |

### 4.2 问题清单

**P0-DEC-1：bootstrap.ts 职责过重（243 行，5 个职责）**

[bootstrap.ts](file:///e:/code/plugins/zhao-channel/server/src/bootstrap.ts) 承担了：
1. 用户生命周期钩子（afterCreate → 自动创建邀请码 + 个人渠道）L14-83
2. has-channel-access-advanced 策略注册 L89-123
3. is-channel-admin 策略注册 L125-160
4. is-channel-owner 策略注册 L162-197
5. Bull Queue 处理器注册 L204-274

每个策略注册约 35 行，结构几乎相同（提取 channelId → 调用 permService → 返回结果），是典型的重复代码。

**P1-DEC-2：channel.ts 754 行，职责混杂**

[channel.ts](file:///e:/code/plugins/zhao-channel/server/src/services/channel.ts) 同时包含：
- CRUD 操作（find/findOne/create/update/delete）
- 渠道网络操作（getNetwork/getHierarchy/getStats/getPublic）
- 注册流程（register — 含用户注册逻辑）
- 格式化工具（formatChannel）
- 权限辅助（getAccessibleChannelIds）

`register()` 方法（L438-634，197 行）内部包含用户注册逻辑（创建用户、设置密码、生成 JWT），与渠道服务职责不符。

**P1-DEC-3：`any` 类型集中在 channel.ts（25 处）和 bootstrap.ts（12 处）**

主要模式：
- `const error: any = new Error()` — 23 处，应为自定义错误类
- `(authService as any).registerPolicy()` — 3 处，zhao-auth 类型定义缺失
- `async (context: any)` — 3 处，策略处理器缺少类型
- `(uc: any)` / `(rc: any)` — 7 处，db.query 返回值未定义类型

**P2-DEC-4：Controller 层 30 处 `strapi.plugin("zhao-channel").service()` 自引用**

Controller 通过 `strapi.plugin("zhao-channel").service("xxx")` 获取同插件 service，而非直接 import。这是 Strapi 插件规范要求，但增加了运行时查找开销和类型不安全。

---

## 5. 可维护性评估

### 5.1 指标数据

| 指标 | 结果 | 状态 |
|------|------|------|
| 文件行数分布 | channel.ts 754 行（超标），其余 <300 行 | 🟡 中 |
| 函数行数分布 | 6 个函数 >50 行，最大 register() 197 行 | 🔴 高 |
| 圈复杂度 | 6 个函数 >10，最大 delete() 35 | 🔴 高 |
| 重复代码 | 3 个策略注册结构相同，2 处 formatChannel 重复 | 🟡 中 |

### 5.2 函数热力图

| 文件 | 函数 | 行数 | 圈复杂度 | 状态 |
|------|------|------|---------|------|
| channel.ts | register() | 197 | 24 | 🔴 |
| channel.ts | delete() | 115 | 35 | 🔴 |
| channel.ts | update() | 98 | 25 | 🔴 |
| channel-member.ts | inviteMember() | 101 | 20 | 🔴 |
| user-invite.ts | createForUser() | 101 | 21 | 🔴 |
| channel.ts | create() | 74 | 12 | 🟡 |
| channel-permission.ts | getUserAllChannels() | 62 | 17 | 🔴 |
| channel.ts | getHierarchy() | 56 | 22 | 🔴 |

### 5.3 问题清单

**P1-MAINT-1：6 个函数圈复杂度 >10**

高圈复杂度意味着难以测试和推理：
- `delete()` 35 — 含事务、递归删除子渠道、级联删除成员/权限/邀请
- `update()` 25 — 含层级校验、路径重建、缓存清理
- `register()` 24 — 含用户注册、渠道创建、成员创建、邀请码验证
- `getHierarchy()` 22 — 含递归构建树、路径解析
- `createForUser()` 21 — 含幂等检查、删除旧记录、分销链计算
- `inviteMember()` 20 — 含邀请码验证、新用户注册、成员创建

**P1-MAINT-2：3 个策略注册结构重复**

[bootstrap.ts](file:///e:/code/plugins/zhao-channel/server/src/bootstrap.ts) 中 `has-channel-access-advanced`（L89-123）、`is-channel-admin`（L125-160）、`is-channel-owner`（L162-197）三个策略注册结构几乎相同：
1. 检查 `context.user?.id`
2. 从 params/body/query 提取 channelId
3. 调用 permService 检查权限
4. 返回 passed/false + 错误码

可提取为通用策略工厂函数。

**P2-MAINT-3：2 处 formatChannel 重复定义**

[channel.ts:29](file:///e:/code/plugins/zhao-channel/server/src/services/channel.ts#L29) 和 [channel-member.ts:8](file:///e:/code/plugins/zhao-channel/server/src/services/channel-member.ts#L8) 各自定义了 `formatChannel` 函数，逻辑相同。

---

## 6. 改进路线图

### P0 — 立即修复（1-3 天）

| 编号 | 问题 | 修复方案 | 影响范围 |
|------|------|---------|---------|
| P0-SEC-1 | Controller 无输入校验 | 在 controller 层添加 zod/joi schema 校验，或使用 Strapi 的 validate 钩子 | 4 个 controller 文件 |
| P0-REL-1 | channel-auth zhao-auth 无降级 | 添加 try-catch，zhao-auth 不可用时返回 503 | channel-auth.ts |
| P0-DEC-1 | bootstrap.ts 职责过重 | 提取策略注册为工厂函数，提取生命周期钩子为独立模块 | bootstrap.ts |

### P1 — 短期改进（1-2 周）

| 编号 | 问题 | 修复方案 | 影响范围 |
|------|------|---------|---------|
| P1-REL-2 | Service 错误处理不一致 | 统一使用自定义 AppError 类，所有公开方法添加 try-catch | 4 个 service 文件 |
| P1-REL-3 | register() 无事务 | 使用 `strapi.db.transaction()` 包裹用户+渠道+成员创建 | channel.ts |
| P1-DEC-2 | channel.ts 职责混杂 | 拆分 register 为独立 RegistrationService，拆分网络操作为 ChannelNetworkService | channel.ts |
| P1-DEC-3 | any 类型集中 | 定义 ChannelDTO/UserDTO 类型，替换 `const error: any` 为 AppError | channel.ts, bootstrap.ts |
| P1-MAINT-1 | 6 个函数圈复杂度 >10 | 拆分为子函数，每个子函数职责单一 | channel.ts, channel-member.ts, user-invite.ts |
| P1-MAINT-2 | 策略注册重复 | 提取 `createChannelPolicy(requiredRole)` 工厂函数 | bootstrap.ts |
| P1-SEC-2 | 日志输出用户 ID | 生产环境日志脱敏，使用 `用户***` 替代 | bootstrap.ts |

### P2 — 长期优化（1 月+）

| 编号 | 问题 | 修复方案 | 影响范围 |
|------|------|---------|---------|
| P2-REL-4 | 无单元测试 | 为 service 层添加纯逻辑单元测试（mock db.query），集成测试保留 | tests/ |
| P2-SEC-3 | content-api auth:false | 评估是否启用 Strapi 内置 JWT + 自定义中间件双层认证 | routes/content-api |
| P2-DEC-4 | Controller 自引用 | 探索 Strapi 5 插件 DI 机制，减少运行时查找 | controllers/ |
| P2-MAINT-3 | formatChannel 重复 | 提取到 utils/format.ts 共享 | channel.ts, channel-member.ts |
