# zhao-channel 插件 API 测试计划（完整版）

## 概述

本测试计划覆盖 `zhao-channel` Strapi 插件的全部功能模块，包括渠道管理、渠道成员管理、渠道权限管理、用户邀请与分销、Content API（REST 端点）、安全边界测试，以及涉及 `users-permissions` 的集成测试。

**测试框架**: Jest + Strapi Bootstrap (无 `supercharge` 依赖)

**分离策略**:
- 不涉及 `users-permissions` 的测试 → 插件目录: `E:/code/plugins/zhao-channel/tests/`
- 涉及 `users-permissions` 的测试 → 项目根目录: `e:/code/basic/tests/`

**执行命令**:
- 插件测试: `npx jest --testPathPattern=../plugins/zhao-channel/tests/`
- 全部测试: `npm test`

---

## 目录 A: 插件目录测试（不涉及 users-permissions）

### A1. 渠道管理 (Channel Service)

**文件**: `channel.test.ts` — **22 个测试用例（现有）** + **+8（新增）**

#### 基础 CRUD（现有 13 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 1 | create — 根节点下创建 regional 渠道 | 成功创建，depth=0 |
| 2 | create — 父渠道下创建 store 子渠道 | parentChannelId 正确 |
| 3 | create — 深度超过 2 级应抛出层级超限错误 | throws "渠道层级深度超限" |
| 4 | find — 应返回分页渠道列表（默认分页） | page=1, pageSize=20 |
| 5 | find — 应支持分页参数 | pageSize 生效 |
| 6 | find — 应支持按 status 过滤 | 仅返回匹配项 |
| 7 | find — 应支持按 channelTier 过滤 | 仅返回匹配项 |
| 8 | findOne — 应返回渠道详情 | id 匹配 |
| 9 | findOne — 不存在的 ID 应返回 null | null |
| 10 | update — 应更新渠道名称 | 名称已修改 |
| 11 | update — 更新不存在的渠道应抛出错误 | throws "渠道不存在" |
| 12 | delete — 应删除指定渠道并返回统计 | deletedChannels ≥ 1 |
| 13 | delete — 删除不存在的渠道应抛出错误 | throws "渠道不存在" |

#### 渠道网络与操作（现有 9 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 14 | createRoot — 应创建 agent 级别的根渠道 | depth=0, channelTier="agent" |
| 15 | register — 有效邀请码应注册成功 | depth > 0 |
| 16 | register — 禁用渠道的邀请码应注册失败 | throws "渠道已被禁用" |
| 17 | register — 无效邀请码应抛出错误 | throws "邀请码不存在或已过期" |
| 18 | validateCode — 有效渠道码应返回 valid=true 和渠道信息 | ok=true, valid=true |
| 19 | validateCode — 禁用渠道码应返回 valid=false | ok=true, valid=false |
| 20 | getNetwork — 应返回渠道及其子渠道 | children 为数组 |
| 21 | getNetwork — 叶子渠道应返回空子节点列表 | children.length=0 |
| 22 | getHierarchy — 应返回完整层级树 | hierarchy.id 匹配 |
| 23 | getStats — 应返回渠道统计信息 | memberCount ≥ 0 |
| 24 | getPublic — 应返回不含敏感字段的公开信息 | status/code 不存在 |
| 25 | getAccessibleChannelIds — 有授权的用户应返回 ID 列表 | number[] |
| 26 | getAccessibleChannelIds — 无授权的用户应返回空数组 | length=0 |
| 27 | getChannelDistributionStats — 有成员渠道应返回统计数据 | stats 含 id |
| 28 | getChannelDistributionStats — 不存在的渠道应返回 null | null |

#### ★ 新增：Lifecycle & Controller（+5 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 29 | bootstrap — 首次启动应创建默认根渠道 | 默认渠道存在 |
| 30 | bootstrap — 重复启动应幂等（不重复创建） | 渠道数量不变 |
| 31 | controller find — 应正确调用 service 并返回格式化响应 | 正常返回 |
| 32 | controller create — 应验证必填参数并返回 200/201 | HTTP 201 |
| 33 | controller update — 应验证 ID 参数有效性 | 无效 ID 返回 400 |

#### ★ 新增：补充场景（+3 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 34 | find — 过滤无效字段应忽略并返回全部 | 默认分页结果 |
| 35 | create — 渠道 code 重复应抛出错误 | throws 唯一性错误 |
| 36 | update — 更新父渠道引用应正确重算 depth | depth 更新 |

---

### A2. 渠道成员管理 (Channel Member Service)

**文件**: `channel-member.test.ts` — **14 个测试用例（现有）** + **+4（新增）**

#### 现有测试（14 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 1 | verifyInvitationCode — 有效渠道码应返回 valid=true | valid=true |
| 2 | verifyInvitationCode — 禁用渠道的邀请码应返回 valid=false | valid=false |
| 3 | getMyChannel — 应返回用户所关联的渠道 | channel 存在 |
| 4 | getMyChannel — 无渠道用户应返回 null | null |
| 5 | getMyChannel — 未设置 currentChannelId 应返回 null | null |
| 6 | updateMyChannel — 应更新用户所在渠道信息 | 字段已更新 |
| 7 | inviteMember — 应邀请现有用户加入渠道 | isNewUser=false |
| 8 | inviteMember — 重复邀请应正常工作（幂等） | 不抛出异常 |
| 9 | inviteMember — 应邀请未注册用户并自动创建记录 | isNewUser=true |
| 10 | getMembers — 应返回渠道的所有成员 | 长度 ≥ 1 |
| 11 | getMembers — 无成员的渠道应返回空数组 | 长度 = 0 |
| 12 | removeMember — 应移除指定成员 | 不再在列表中 |
| 13 | updateMemberRole — 应将成员角色更新为 admin | 角色变更 |
| 14 | updateMemberRole — 不存在的成员应抛出错误 | throws "成员不存在" |

#### ★ 新增：补充场景（+4 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 15 | inviteMember — 无效 email 格式应抛出错误 | throws |
| 16 | inviteMember — 邀请者无权限邀请应抛出错误 | throws |
| 17 | getMembers — 不存在的渠道应返回空数组 | length=0 |
| 18 | updateMyChannel — 用户无关联渠道应抛出错误 | throws |

---

### A3. 渠道权限管理 (Channel Permission Service)

**文件**: `channel-permission.test.ts` — **12 个测试用例（现有）** + **+9（新增）**

#### 现有测试（12 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 1 | grantChannelsToUser — 应成功为用户授权渠道 | granted ≥ 1 |
| 2 | grantChannelsToUser — 重复授权应返回 granted=0 | granted=0 |
| 3 | batchGrantAsync — 应返回 jobId 和 queued 状态 | status="queued" |
| 4 | revokeChannelsFromUser — 应撤销授权 | revoked ≥ 1 |
| 5 | revokeChannelsFromUser — 撤销未授权渠道应返回 0 | revoked=0 |
| 6 | getUserChannels — 应返回用户已授权渠道列表 | 含 id, name |
| 7 | getUserChannels — 无授权用户应返回空数组 | length=0 |
| 8 | getBatchGrantStatus — 无效 jobId 应返回（不抛异常） | 返回状态对象 |
| 9 | getBatchGrantStatus — 有效 jobId 应返回状态信息 | 含 jobId, status |
| 10 | getUserAllChannels — 应返回用户所有可访问渠道 ID | number[] |
| 11 | getUserAllChannels — 无授权用户应返回空数组 | length=0 |
| 12 | grantChannelsToUser — 批量授权多个用户 | granted ≥ 2 |

#### ★ 新增：Role 方法 + 补充场景（+9 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 13 | grantChannelsToRole — 应成功为 Strapi 角色授权渠道 | granted ≥ 1 |
| 14 | grantChannelsToRole — 重复授权幂等 | granted=0 |
| 15 | revokeChannelsFromRole — 应撤销角色渠道授权 | revoked ≥ 1 |
| 16 | revokeChannelsFromRole — 撤销未授权渠道优雅处理 | revoked=0 |
| 17 | getRoleChannels — 应返回角色已授权渠道列表 | 含 id, name |
| 18 | getRoleChannels — 无授权角色返回空数组 | length=0 |
| 19 | batchGrantAsync — type="role" 应正常工作 | status="queued" |
| 20 | batchGrantAsync — 无效 type 参数应抛出错误 | throws |
| 21 | grantChannelsToUser — 授权不存在的用户应优雅处理 | 不抛异常 |

---

### A4. 用户邀请与分销 (User Invite Service)

**文件**: `user-invite.test.ts` — **14 个测试用例（现有）** + **+3（新增）**

#### 现有测试（14 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 1 | createForUser — 不传邀请码应创建有机注册记录 | inviteMethod="organic" |
| 2 | createForUser — 传入有效邀请码应创建邀请记录 | inviteMethod="invite_code" |
| 3 | createForUser — 通过已邀请用户创建应形成深度=2 链 | distributionDepth=2 |
| 4 | findByInviteCode — 应返回邀请码对应的记录 | 含 user 字段 |
| 5 | findByInviteCode — 不存在的邀请码应返回 null | null |
| 6 | findByUserId — 应返回该用户的邀请记录 | 含 user 字段 |
| 7 | findByUserId — 无记录的用户应返回 null | null |
| 8 | getDistributionChain — 应返回用户的分销链（升序） | 首个 depth=0 |
| 9 | getDistributionChain — 无分销链用户应返回空数组 | length=0 |
| 10 | getDistributionChain — 深度=2 的用户应返回完整链 | 链长 ≥ 2 |
| 11 | getDirectDownstream — 应返回用户直接下级 | 含 userId |
| 12 | getDirectDownstream — 无下级用户应返回空数组 | length=0 |
| 13 | getAllDownstream — 应返回所有下级（递归） | 数组格式 |
| 14 | getAllDownstream — 无下级用户应返回空数组 | length=0 |
| 15 | getUserDistributionStats — 应返回个人分销统计 | 含 stats |
| 16 | getUserDistributionStats — 无记录用户应返回 null | null |
| 17 | getChannelDistributionStats — 应返回渠道分销统计 | 含 directCustomerCount |
| 18 | getChannelDistributionStats — 空渠道应返回全 0 | directCustomerCount=0 |

#### ★ 新增：补充场景（+3 个）
| # | 测试名称 | 预期结果 |
|---|---------|---------|
| 19 | createForUser — 使用自身邀请码应抛出错误 | throws |
| 20 | createForUser — 无效邀请码应抛出错误 | throws |
| 21 | getDirectDownstream — 用户 A 的下级不包含用户 B 的非直接下级 | 隔离性 |

---

### A5. Content API (HTTP REST 端点)

**文件**: `content-api.test.ts` — **19 个测试用例（现有）** + **+7（新增）**

#### 现有测试（19 个）
| # | 端点 | 预期 HTTP 状态 |
|---|------|---------------|
| 1 | GET /api/zhao-channel/channel | 200 |
| 2 | GET /api/zhao-channel/channel/:id | 200 |
| 3 | POST /api/zhao-channel/channel | 201/200 |
| 4 | PUT /api/zhao-channel/channel/:id | 200 |
| 5 | DELETE /api/zhao-channel/channel/:id | 200 |
| 6 | POST /api/zhao-channel/channel/register | 200/201 |
| 7 | POST /api/zhao-channel/channel/validate | 200 |
| 8 | GET /api/zhao-channel/channel/network/:id | 200 |
| 9 | GET /api/zhao-channel/channel/stats/:id | 200 |
| 10 | GET /api/zhao-channel/channel/public/:id | 200 |
| 11 | GET /api/zhao-channel/channel-members | 200 |
| 12 | POST /api/zhao-channel/channel-members | 200/201 |
| 13 | GET /api/zhao-channel/permissions/user/:userId/accessible | 200 |
| 14 | POST /api/zhao-channel/permissions/batch-grant | 200 |
| 15 | GET /api/zhao-channel/user-invite/my-chain | 200 |
| 16 | GET /api/zhao-channel/user-invite/my-downstream | 200 |
| 17 | GET /api/zhao-channel/user-invite/my-stats | 200 |
| 18 | 不存在路由 → 404 | 404 |
| 19 | 无效 ID 参数 → 400/404 | 400/404 |

#### ★ 新增：请求验证（+4 个）
| # | 端点 | 预期 |
|---|------|------|
| 20 | POST /api/zhao-channel/channel — 缺失 name 字段 | 400 |
| 21 | POST /api/zhao-channel/channel-members — 缺失 email 字段 | 400 |
| 22 | POST /api/zhao-channel/permissions/batch-grant — 缺失 channelIds | 400 |
| 23 | GET /api/zhao-channel/channel — 无效 pageSize 参数（负数） | 400 |

#### ★ 新增：更多端点（+3 个）
| # | 端点 | 预期 |
|---|------|------|
| 24 | GET /api/zhao-channel/channel/hierarchy/:id | 200 |
| 25 | GET /api/zhao-channel/channel/distribution/:id | 200 |
| 26 | GET /api/zhao-channel/permissions/batch-status/:jobId | 200 |

---

### A6. 安全与异常边界 (Security)

**文件**: `security.test.ts` — **17 个测试用例（现有）** + **+3（新增）**

#### 现有测试（17 个）
| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | createChannel — 空名称应优雅处理 | throws |
| 2 | createChannel — 无效层级应抛出错误 | throws |
| 3 | createChannel — XSS 字符串应转义或阻止 | throws |
| 4 | findById — 不存在 ID 应返回 null | null |
| 5 | findByCode — 不存在 Code 应返回 null | null |
| 6 | updateChannel — 更新不存在渠道应抛出错误 | throws |
| 7 | deleteChannel — 删除不存在渠道应抛出错误 | throws |
| 8 | removeMember — 从不存在渠道移除成员应优雅处理 | rejects |
| 9 | grantChannelsToUser — 空渠道 ID 数组应返回 granted=0 | 0 |
| 10 | batchGrantAsync — 空渠道数组应优雅处理 | 正常返回 |
| 11 | inviteMember — 空邮件应抛出错误 | throws |
| 12 | createForUser — 超大用户 ID 应优雅处理 | rejects |
| 13 | grantChannelsToUser — 重复授权返回 granted=0 | 0 |
| 14 | findByInviteCode — 多次调用返回一致结果 | toEqual |
| 15 | getMembers — 渠道 A 不应返回渠道 B 的成员 | 不重叠 |
| 16 | getUserAllChannels — 用户不应看到未授权的渠道 | length=0 |
| 17 | 错误消息不应包含 SQL 或数据库细节 | 无敏感词 |

#### ★ 新增：更多安全场景（+3 个）
| # | 测试名称 | 预期 |
|---|---------|------|
| 18 | createChannel — description 字段 XSS 注入 | 转义/阻止 |
| 19 | inviteMember — SQL 注入尝试（email="' OR 1=1 --"） | throws |
| 20 | find — 路径遍历尝试（channelTier="../../../etc"） | 不泄露文件 |

---

## 目录 B: 根目录测试（涉及 users-permissions）

### B1. 用户注册流程集成

**文件**: `e:/code/basic/tests/channel-register-flow.test.ts` — **5 个测试用例**

| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | 通过 users-permissions 注册新用户后自动创建邀请记录 | 邀请记录存在 |
| 2 | 注册时传入邀请 code 正确建立分销链 | distributionDepth=1 |
| 3 | 注册用户自动成为默认渠道成员 | 渠道成员记录存在 |
| 4 | 已存在用户不能重复注册邀请记录 | 幂等 |
| 5 | 注册流程中异常回滚（数据库事务） | 数据一致 |

### B2. 角色与渠道权限联动

**文件**: `e:/code/basic/tests/channel-role-permission.test.ts` — **5 个测试用例**

| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | 为 authenticated role 授权默认渠道 | 所有认证用户可访问 |
| 2 | 创建自定义 role → 授权渠道 → 用户继承权限 | getUserChannels 返回 |
| 3 | 撤销 role 渠道授权 → 用户失去访问权 | 空数组 |
| 4 | 用户同时有 role 继承 + 个人授权 → 去重合并 | 无重复项 |
| 5 | 多个 role 的渠道权限取并集 | 完整列表 |

### B3. 权限授权检查

**文件**: `e:/code/basic/tests/channel-authz.test.ts` — **4 个测试用例**

| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | 非授权用户无法创建渠道（Content API） | 403 |
| 2 | 渠道管理员可以管理本渠道成员 | 成功 |
| 3 | 普通成员无法移除其他成员 | 403 |
| 4 | 无权限用户无法查看渠道统计 | 403 |

### B4. 认证中间件集成

**文件**: `e:/code/basic/tests/channel-auth-middleware.test.ts` — **3 个测试用例**

| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | 无 JWT token 请求应返回 401 | 401 |
| 2 | 过期/无效 JWT token 应返回 401 | 401 |
| 3 | 有效 JWT token 应正常通过 | 200 |

### B5. 跨插件集成

**文件**: `e:/code/basic/tests/cross-plugin-integration.test.ts` — **4 个测试用例**

| # | 测试名称 | 预期 |
|---|---------|------|
| 1 | zhao-channel 邀请创建 → zhao-invite 同步生成邀请记录 | 两端一致 |
| 2 | zhao-invite 消耗邀请码 → zhao-channel 成员加入 | 成员 +1 |
| 3 | 跨插件事务一致性（邀请失败时回滚） | 数据不回滚 |
| 4 | 两个插件同一界面 API 调用成功 | HTTP 200 |

---

## 种子数据补充计划

**文件**: `E:/code/plugins/zhao-channel/tests/fixtures/seed.ts`

| 补充内容 | 说明 |
|---------|------|
| Strapi Role 记录 | 创建 2 个自定义角色（channel_admin, channel_viewer），用于 role 权限测试 |
| Role-Channel 授权 | seed 中预置某些角色的渠道授权 |
| 更多用户变体 | 增加无角色用户、多角色用户 |

---

## 测试统计总表

| 目录 | 模块 | 文件 | 现有用例 | 新增用例 | 总用例 |
|------|------|------|---------|---------|-------|
| 插件 | 渠道管理 | channel.test.ts | 22 | +8 | 30 |
| 插件 | 渠道成员管理 | channel-member.test.ts | 14 | +4 | 18 |
| 插件 | 渠道权限管理 | channel-permission.test.ts | 12 | +9 | 21 |
| 插件 | 用户邀请与分销 | user-invite.test.ts | 14 | +3 | 17 |
| 插件 | Content API | content-api.test.ts | 19 | +7 | 26 |
| 插件 | 安全与异常边界 | security.test.ts | 17 | +3 | 20 |
| 插件 | Lifecycle | bootstrap.test.ts | 0 | +3 | 3 |
| 根目录 | 用户注册集成 | channel-register-flow.test.ts | 0 | +5 | 5 |
| 根目录 | 角色权限联动 | channel-role-permission.test.ts | 0 | +5 | 5 |
| 根目录 | 权限授权检查 | channel-authz.test.ts | 0 | +4 | 4 |
| 根目录 | 认证中间件 | channel-auth-middleware.test.ts | 0 | +3 | 3 |
| 根目录 | 跨插件集成 | cross-plugin-integration.test.ts | 0 | +4 | 4 |
| **总计** | | **12 文件** | **92** | **+52** | **~144** |

---

## 实施优先级

| 优先级 | 阶段 | 内容 | 预计工作量 |
|-------|------|------|-----------|
| P0 | 阶段一 | 运行现有测试，修复失败用例 | 30min |
| P1 | 阶段二 | 插件目录 +31 个新增用例 | 2h |
| P2 | 阶段三 | seed 数据补充（role 等） | 30min |
| P3 | 阶段四 | 根目录 +21 个涉及 users-permissions 测试 | 2h |
| P4 | 阶段五 | 跨插件集成测试 | 1h |

---

## 测试环境要求

- Node.js ≥ 18
- Strapi 项目（当前工作目录 `e:/code/basic`）
- 测试数据库配置（使用 SQLite 避免外部依赖）
- 配置文件 `jest.setup.env.ts`
- 涉及 `users-permissions` 的测试需在根目录运行完整的 Strapi bootstrap