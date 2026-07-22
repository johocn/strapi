# 三个技术债清理设计

> 日期：2026-07-22
> 状态：待审阅
> 范围：清理 zhao-auth 插件三个技术债 —— 废弃模块残留、跨插件 admin 组件代码重复、addMenuLink permissions 前缀不一致

---

## 1. 背景与目标

### 1.1 背景

zhao-auth admin + permission foundation 实施计划（15 个 task）完成后，识别出三个技术债：

1. **has-role / has-course-permission / authenticate middleware 模块缺失**：30 个测试失败，原因是测试 import 不存在的源文件
2. **跨插件 admin 组件引用未实现**：zhao-studio 逐字节复制了 zhao-auth 的 3 个权限组件（PermissionsProvider / PermissionGate / useMyPermissions）
3. **`plugin::zhao-studio.read` 与路由 `zhao-studio.read` 前缀不一致**：addMenuLink 的 permissions 字段误带 `plugin::` 前缀

### 1.2 目标

- 技术债 1：清理废弃测试 + 修复 role-management.service.ts 全局 strapi 问题
- 技术债 2：保留复制代码 + 加同步测试防止漂移（评估后认为迁移到 zhao-common 投入产出比不高）
- 技术债 3：去掉 addMenuLink 的 `plugin::` 前缀，与全链路对齐

### 1.3 关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 废弃 policy 处理 | 删除废弃测试，不补充实现 | has-role/has-course-permission 在所有路由零引用，policies/index.ts 已标记废弃，只有测试残留 |
| authenticate middleware 处理 | 删除引用测试 | 所有路由用 is-authenticated policy（44 处），不是这个 middleware，纯测试残留 |
| role-management 全局 strapi | 移入工厂闭包 | 4 个模块级函数引用全局 strapi 导致测试失败，移入闭包是最小改动 |
| 跨插件组件统一 | 方案 A：保留复制 + 同步测试 | 迁移到 zhao-common 投入产出比不高（140 行重复 vs 40 文件改动 + 构建链高风险） |
| addMenuLink 前缀 | 去掉 `plugin::` 前缀 | 与 PERMISSION_TREE / 路由 / policy / 前端全链路对齐，最小改动 2 文件各 1 行 |

---

## 2. 技术债 1：废弃模块清理 + role-management 修复

### 2.1 废弃模块评估结论

经 Grep 全量搜索，三个"缺失模块"在所有插件路由中**零引用**：

| 模块 | 路由引用 | 生产代码引用 | 测试引用 | 结论 |
|------|---------|------------|---------|------|
| has-role policy | 0 处 | 仅 policies/index.ts 第 23 行废弃注释 | 3 个测试文件 | 废弃，删除测试 |
| has-course-permission policy | 0 处 | 无 | 2 个测试文件 | 废弃，删除测试 |
| authenticate middleware | 0 处 | 无 | 2 个测试文件 | 废弃，删除测试 |

所有插件路由统一使用 `is-authenticated` policy（44 处引用），不依赖这三个废弃模块。

### 2.2 删除的测试文件（6 个）

| 文件 | 引用的废弃模块 | 测试用例数 |
|------|--------------|----------|
| `tests/policies.test.ts` | has-role + has-course-permission | ~20 |
| `tests/has-role-coverage.test.ts` | has-role | ~10 |
| `tests/has-role-admin-detection.test.ts` | has-role | ~5 |
| `tests/has-course-permission-coverage.test.ts` | has-course-permission | ~10 |
| `tests/middleware-auth.test.ts` | authenticate middleware | ~8 |
| `tests/authenticate-middleware-coverage.test.ts` | authenticate middleware | ~10 |

删除后预计减少约 63 个测试用例（全部是当前失败的用例）。

### 2.3 policies/index.ts 清理

移除第 18-24 行的废弃策略注释块。保留 `export default` 中的 6 个活跃 policy 不变。

### 2.4 role-management.service.ts 全局 strapi 修复

**问题**：4 个模块级函数定义在 `export default` 工厂外，引用全局 `strapi` 而非闭包参数：

| 函数 | 定位（约） | 全局 strapi 调用 | 调用者 |
|------|----------|----------------|--------|
| `getRoleLevel(role)` | 工厂外模块级 | `strapi.db.query(PERMISSION_UID).findOne(...)` | `getUserLevel` |
| `getUserLevel(userId)` | 工厂外模块级 | `strapi.db.query(USER_UID).findOne(...)` | `assignRole`, `revokeRole`, `getUserLevel` |
| `computeOperatorOwnedRoles(operatorId, ...)` | 工厂外模块级 | `strapi.db.query(USER_UID).findOne(...)` + `strapi.plugin("zhao-auth").service("permission")...` | `assignRole`, `revokeRole`, `getAssignableRoles` |
| `resolveTenantUserIds(operatorId, ...)` | 工厂外模块级 | `strapi.db.query("plugin::zhao-channel.channel-member")...` | `findUsers` |

> 注：具体行号在实现时确认，spec 中用"工厂外模块级"描述定位，避免行号漂移。

**修复方案**：将这 4 个函数移入 `export default ({ strapi }) => ({...})` 工厂闭包内部。这是最小改动：
- 不改变函数签名和行为
- 只改变作用域（从模块级移到闭包内）
- 函数内部引用的 `strapi` 自动变为闭包参数

**影响**：修复后 `role-management.test.ts`、`role-model-consistency.test.ts`、`role-management-coverage.test.ts` 中涉及 `assignRole`/`revokeRole`/`findUsers`/`getAssignableRoles` 的测试将不再报 "strapi is not defined"。

### 2.5 预期测试结果

修复后 zhao-auth 测试状态：
- 删除 6 个废弃测试文件（减少约 63 个失败用例）
- 修复 role-management 全局 strapi 问题（减少约 10 个失败用例）
- 剩余失败用例（如有）应为其他预存问题

---

## 3. 技术债 2：跨插件 admin 组件 —— 保留复制 + 同步测试

### 3.1 现状

zhao-studio 在 admin 中逐字节复制了 zhao-auth 的 3 个权限组件：

| zhao-auth 文件 | zhao-studio 复制文件 | 差异 |
|---------------|---------------------|------|
| `admin/src/context/PermissionsProvider.tsx` | `admin/src/context/PermissionsProvider.tsx` | zhao-studio 版内联了 fetchMyInfo（因无法 import zhao-auth api 模块） |
| `admin/src/components/PermissionGate.tsx` | `admin/src/components/PermissionGate.tsx` | 逐字节相同 |
| `admin/src/hooks/useMyPermissions.ts` | `admin/src/hooks/useMyPermissions.ts` | 逐字节相同 |

### 3.2 不迁移的理由

迁移到 zhao-common admin 的投入产出比评估：

| 维度 | 迁移到 zhao-common | 保留复制 + 同步测试 |
|------|-------------------|-------------------|
| 文件改动 | 约 40 个 | 1 个新测试文件 |
| 构建链风险 | 高（zhao-common 不注册插件，SDK build 可能报错） | 无 |
| 消除重复 | 140 行 | 0 行（但同步测试防止行为漂移） |
| 未来扩展 | zhao-website/zhao-wealth 可直接 import | 未来仍需复制（但复制成本低） |
| YAGNI | zhao-website/zhao-wealth 目前不需要权限组件 | 符合 YAGNI |

**结论**：保留复制代码，加同步测试防止两份代码行为漂移。

### 3.3 同步测试设计

新增测试文件：`d:\zhao\strapi\plugins\zhao-studio\tests\admin\permissions-parity.test.tsx`

**测试策略**：测试 zhao-studio 复制组件的**预期行为**（固定断言），不与 zhao-auth 实时对比。当 zhao-auth 修改权限组件行为时，开发者需同步更新 zhao-studio 的复制代码和此测试的预期。

**测试用例**：

1. **PermissionsProvider 行为验证**
   - mock fetchMyInfo 返回固定权限集（如 `['zhao-studio.read', 'zhao-studio.collect-source.manage']`）
   - 用 zhao-studio 的 PermissionsProvider 包裹子组件
   - 断言 useMyPermissions 返回的 permissions/channelScope/tenant/user 与 mock 数据一致
   - 断言 hasPermission('zhao-studio.read') 返回 true（权限集中有该 action）
   - 断言 hasPermission('zhao-studio.unknown') 返回 false（权限集中无该 action）

2. **PermissionGate 行为验证**
   - 有权限时渲染 children
   - 无权限时不渲染 children
   - mode='disable' 时渲染但禁用
   - fallback prop 正确渲染

3. **PermissionButton 行为验证**
   - 有权限时按钮可点击
   - 无权限时按钮禁用或隐藏

**防漂移机制**：此测试在 zhao-studio 中运行，基于固定的预期行为。如果 zhao-auth 修改了 PermissionsProvider/PermissionGate 的行为契约（如 hasPermission 返回值变化、PermissionGate mode 语义变化），zhao-studio 的复制代码必须同步更新，否则此测试会因复制代码与预期不符而失败。测试文件头部注释明确提醒：修改 zhao-auth 权限组件时需同步更新本测试。

> 注：此测试**不能**自动检测 zhao-auth 的变更 —— 它只在 zhao-studio 复制代码与自身预期不符时失败。真正的防漂移依赖开发流程规范：修改 zhao-auth 权限组件时，PR 检查清单要求同步更新 zhao-studio 复制代码和此测试。

### 3.4 文件头部注释

zhao-studio 的 3 个复制文件已有降级说明注释。补充提醒：

```typescript
// 同步测试：tests/admin/permissions-parity.test.tsx
// 修改 zhao-auth 权限组件时，请同步更新本文件和同步测试
```

---

## 4. 技术债 3：addMenuLink permissions 前缀统一

### 4.1 问题

`addMenuLink.permissions.action` 在 2 个文件中误带 `plugin::` 前缀：

| 位置 | 当前值 | 期望值 |
|------|--------|--------|
| `zhao-studio/admin/src/index.ts:15` | `plugin::zhao-studio.read` | `zhao-studio.read` |
| `zhao-auth/admin/src/index.ts:16` | `plugin::zhao-auth.user.manage` | `zhao-auth.user.manage` |

### 4.2 全链路一致性分析

| 使用位置 | 格式 | 是否带 `plugin::` |
|---------|------|------------------|
| addMenuLink.permissions.action（2 处） | `plugin::xxx.yyy` | **带（错误）** |
| PERMISSION_TREE 所有叶子 key | `xxx.yyy` | 不带 |
| DEFAULT_ROLE_PERMISSIONS | `xxx.yyy` | 不带 |
| getMyPermissions 返回值 | `xxx.yyy` | 不带 |
| has-permission policy 校验逻辑 | 直接 `.includes(action)` | 不做前缀处理 |
| content-api.ts 路由 permission 参数 | `xxx.yyy` | 不带 |
| PluginLayout.tsx menuConfig.permission | `xxx.yyy` | 不带 |
| PermissionGate action prop | `xxx.yyy` | 不带 |

**实际影响**：非 admin 用户的菜单可见性检查会因字符串不匹配而失败。admin 用户在 has-permission policy 第 25 行被直接放行，掩盖了此问题。

### 4.3 修复方案

**最小修改**：仅改 2 个 admin/src/index.ts 文件，各改 1 行。

```typescript
// zhao-studio/admin/src/index.ts
// 修改前：permissions: [{ action: 'plugin::zhao-studio.read', subject: null }]
// 修改后：permissions: [{ action: 'zhao-studio.read', subject: null }]

// zhao-auth/admin/src/index.ts
// 修改前：permissions: [{ action: 'plugin::zhao-auth.user.manage', subject: null }]
// 修改后：permissions: [{ action: 'zhao-auth.user.manage', subject: null }]
```

### 4.4 不需要修改的位置

- **PERMISSION_TREE**：已不带前缀
- **DEFAULT_ROLE_PERMISSIONS**：已不带前缀
- **has-permission policy**：不做前缀归一化，调用方对齐即可
- **content-api.ts 路由**：已不带前缀
- **PluginLayout.tsx / PermissionGate 页面**：已不带前缀
- **policy 名称 `plugin::zhao-auth.has-permission`**：这是 policy 在 registry 中的命名空间，**应保留 `plugin::` 前缀**（Strapi v5 policy 命名规范）
- **content-type UID `plugin::zhao-auth.permission`**：Strapi UID 命名规范，**应保留**

### 4.5 验证

修改后重建 2 个插件的 admin bundle。无需数据库迁移（PERMISSION_TREE 中已有对应的 `zhao-studio.read` / `zhao-auth.user.manage` key）。

---

## 5. 改动范围

### 5.1 文件清单

| 技术债 | 操作 | 文件 | 说明 |
|--------|------|------|------|
| 1 | 删除 | `zhao-auth/tests/policies.test.ts` | 废弃测试 |
| 1 | 删除 | `zhao-auth/tests/has-role-coverage.test.ts` | 废弃测试 |
| 1 | 删除 | `zhao-auth/tests/has-role-admin-detection.test.ts` | 废弃测试 |
| 1 | 删除 | `zhao-auth/tests/has-course-permission-coverage.test.ts` | 废弃测试 |
| 1 | 删除 | `zhao-auth/tests/middleware-auth.test.ts` | 废弃测试 |
| 1 | 删除 | `zhao-auth/tests/authenticate-middleware-coverage.test.ts` | 废弃测试 |
| 1 | 修改 | `zhao-auth/server/src/policies/index.ts` | 移除废弃注释（第 18-24 行） |
| 1 | 修改 | `zhao-auth/server/src/services/role-management.service.ts` | 4 个模块级函数移入工厂闭包 |
| 2 | 新建 | `zhao-studio/tests/admin/permissions-parity.test.tsx` | 同步测试 |
| 2 | 修改 | `zhao-studio/admin/src/context/PermissionsProvider.tsx` | 补充同步提醒注释 |
| 2 | 修改 | `zhao-studio/admin/src/components/PermissionGate.tsx` | 补充同步提醒注释 |
| 2 | 修改 | `zhao-studio/admin/src/hooks/useMyPermissions.ts` | 补充同步提醒注释 |
| 3 | 修改 | `zhao-studio/admin/src/index.ts` | 去掉 `plugin::` 前缀（1 行） |
| 3 | 修改 | `zhao-auth/admin/src/index.ts` | 去掉 `plugin::` 前缀（1 行） |

总计：6 删除 + 8 修改 + 1 新建 = 15 个文件操作

### 5.2 不涉及的文件

- zhao-common（不新建 admin 子工程）
- zhao-website / zhao-wealth（不接入权限组件）
- PERMISSION_TREE / DEFAULT_ROLE_PERMISSIONS（已正确）
- has-permission policy（已正确）
- 所有路由文件（已正确）

---

## 6. 测试策略

### 6.1 技术债 1 验证

```bash
cd strapi/plugins/zhao-auth
npx --no-install jest --config tests/jest.config.ts --no-coverage
```

预期：
- 删除 6 个废弃测试文件后，测试总数减少约 63 个
- 修复 role-management 全局 strapi 后，`role-management.test.ts` / `role-model-consistency.test.ts` / `role-management-coverage.test.ts` 中的 "strapi is not defined" 错误消失
- 剩余失败（如有）应为其他预存问题

### 6.2 技术债 2 验证

```bash
cd strapi/plugins/zhao-studio
npx --no-install jest tests/admin/permissions-parity.test.tsx --config tests/jest.config.ts --no-coverage
```

预期：同步测试 3-5 个用例全部通过。

### 6.3 技术债 3 验证

```bash
cd strapi/plugins/zhao-auth && npm run build
cd strapi/plugins/zhao-studio && npm run build
```

预期：build 成功，`dist/admin/index.js` 中的 permissions 字符串不再带 `plugin::` 前缀。

### 6.4 回归验证

4 个插件（zhao-auth / zhao-studio / zhao-deal / zhao-track）全量测试 + build，确保无新失败。

---

## 7. 已知限制

- **废弃模块不补充实现**：has-role / has-course-permission / authenticate middleware 被彻底删除（测试删除 + 注释清理），不再保留任何痕迹。如果未来需要角色检查，应使用 has-permission policy + PERMISSION_TREE 角色映射
- **跨插件组件仍为复制**：技术债 2 选择保留复制 + 同步测试，不消除代码重复。未来 zhao-website/zhao-wealth 需要权限组件时仍需复制
- **addMenuLink 前缀修复不改变后端行为**：admin 用户不受影响（一直被放行），非 admin 用户的菜单可见性修复是唯一实际效果

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 删除废弃测试后覆盖率下降 | 低（废弃模块本就不在生产代码中使用） | 接受，废弃模块无需覆盖 |
| role-management 函数移入闭包可能遗漏内部调用 | 中 | 移入后运行全量测试验证 |
| 同步测试可能因 mock 不完整而误判 | 低 | 测试基于固定预期行为，非实时对比 |
| addMenuLink 前缀修改后 admin 菜单对非 admin 用户变可见 | 低（这是修复，不是回归） | 验证非 admin 用户菜单显示正确 |
