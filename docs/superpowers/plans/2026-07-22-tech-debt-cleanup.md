# 三个技术债清理 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清理 zhao-auth 插件三个技术债 —— 废弃模块残留测试、跨插件 admin 组件代码重复防护、addMenuLink permissions 前缀不一致。

**Architecture:** 删除 6 个引用废弃模块的测试文件 + 修复 role-management.service.ts 全局 strapi 问题；在 zhao-studio 配置 tsx 测试环境并编写同步测试；修复 2 个 addMenuLink 前缀。

**Tech Stack:** Strapi v5, TypeScript, Jest + ts-jest, React Testing Library, antd

---

## File Structure

### 删除文件（zhao-auth）
- `tests/policies.test.ts` — 引用 has-role + has-course-permission
- `tests/has-role-coverage.test.ts` — 引用 has-role
- `tests/has-role-admin-detection.test.ts` — 引用 has-role
- `tests/has-course-permission-coverage.test.ts` — 引用 has-course-permission
- `tests/middleware-auth.test.ts` — 引用 authenticate middleware
- `tests/authenticate-middleware-coverage.test.ts` — 引用 authenticate middleware

### 修改文件（zhao-auth）
- `server/src/policies/index.ts` — 移除废弃策略注释块（第 18-24 行）
- `server/src/services/role-management.service.ts` — 4 个模块级函数移入工厂闭包
- `admin/src/index.ts` — addMenuLink permissions 去掉 `plugin::` 前缀

### 修改文件（zhao-studio）
- `package.json` — devDependencies 加 @testing-library/react、@testing-library/jest-dom、jest-environment-jsdom
- `tests/jest.config.ts` — testMatch + moduleFileExtensions 加 tsx
- `tests/tsconfig.json` — 加 jsx 相关配置
- `admin/src/context/PermissionsProvider.tsx` — 补充同步提醒注释
- `admin/src/components/PermissionGate.tsx` — 补充同步提醒注释
- `admin/src/hooks/useMyPermissions.ts` — 补充同步提醒注释
- `admin/src/index.ts` — addMenuLink permissions 去掉 `plugin::` 前缀

### 新增文件（zhao-studio）
- `tests/admin/permissions-parity.test.tsx` — 同步测试

---

## Task 1: 删除 6 个废弃测试文件

**Files:**
- Delete: `strapi/plugins/zhao-auth/tests/policies.test.ts`
- Delete: `strapi/plugins/zhao-auth/tests/has-role-coverage.test.ts`
- Delete: `strapi/plugins/zhao-auth/tests/has-role-admin-detection.test.ts`
- Delete: `strapi/plugins/zhao-auth/tests/has-course-permission-coverage.test.ts`
- Delete: `strapi/plugins/zhao-auth/tests/middleware-auth.test.ts`
- Delete: `strapi/plugins/zhao-auth/tests/authenticate-middleware-coverage.test.ts`

- [ ] **Step 1: 确认 6 个文件存在**

Run: `cd strapi/plugins/zhao-auth && dir tests\policies.test.ts tests\has-role-coverage.test.ts tests\has-role-admin-detection.test.ts tests\has-course-permission-coverage.test.ts tests\middleware-auth.test.ts tests\authenticate-middleware-coverage.test.ts`
Expected: 6 个文件都存在

- [ ] **Step 2: 删除 6 个废弃测试文件**

使用 DeleteFile 工具删除以下 6 个文件：
- `d:\zhao\strapi\plugins\zhao-auth\tests\policies.test.ts`
- `d:\zhao\strapi\plugins\zhao-auth\tests\has-role-coverage.test.ts`
- `d:\zhao\strapi\plugins\zhao-auth\tests\has-role-admin-detection.test.ts`
- `d:\zhao\strapi\plugins\zhao-auth\tests\has-course-permission-coverage.test.ts`
- `d:\zhao\strapi\plugins\zhao-auth\tests\middleware-auth.test.ts`
- `d:\zhao\strapi\plugins\zhao-auth\tests\authenticate-middleware-coverage.test.ts`

- [ ] **Step 3: 运行剩余测试验证无 import 错误**

Run: `cd strapi/plugins/zhao-auth && npx --no-install jest --config tests/jest.config.ts --no-coverage 2>&1 | Select-Object -Last 30`
Expected: 测试正常运行（可能有失败，但不应出现 "Cannot find module" 引用已删除文件的错误）

- [ ] **Step 4: Commit**

```bash
cd strapi/plugins/zhao-auth
git add -A
git commit -m "refactor: remove 6 deprecated test files for has-role/has-course-permission/authenticate-middleware"
```

---

## Task 2: 清理 policies/index.ts 废弃注释

**Files:**
- Modify: `strapi/plugins/zhao-auth/server/src/policies/index.ts`

- [ ] **Step 1: 读取当前文件确认注释位置**

Read `strapi/plugins/zhao-auth/server/src/policies/index.ts`，确认第 18-24 行的废弃策略注释块。

- [ ] **Step 2: 移除废弃策略注释块**

将第 8-25 行的注释块替换为精简版：

```typescript
/**
 * 策略导出（Strapi 原生签名）
 *
 * 统一策略清单:
 * - is-authenticated: 认证检查（提取JWT + 验证 + 注入user）
 * - has-permission: 功能权限检查（config.action 指定权限动作）
 * - has-channel-access: 特定渠道访问权（需要 channelId）
 * - has-channel-scope: 渠道范围解析（非阻断，注入 channelScope）
 * - has-tenant-access: 租户访问校验（siteId 与用户渠道交集校验）
 */
```

即删除第 18-24 行的 "已废弃策略" 注释块。

- [ ] **Step 3: 验证文件正确**

Run: `cd strapi/plugins/zhao-auth && npx --no-install tsc --noEmit --project tsconfig.json 2>&1 | Select-String "policies/index"`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
cd strapi/plugins/zhao-auth
git add server/src/policies/index.ts
git commit -m "refactor: remove deprecated policy comments from policies/index.ts"
```

---

## Task 3: role-management.service.ts 4 个函数移入工厂闭包

**Files:**
- Modify: `strapi/plugins/zhao-auth/server/src/services/role-management.service.ts`

- [ ] **Step 1: 读取文件确认 4 个函数位置**

Read `strapi/plugins/zhao-auth/server/src/services/role-management.service.ts`，确认：
- 第 69-76 行：`getRoleLevel` 函数
- 第 81-92 行：`getUserLevel` 函数
- 第 105-146 行：`computeOperatorOwnedRoles` 函数
- 第 161-187 行：`resolveTenantUserIds` 函数
- 第 260 行：`export default ({ strapi }: { strapi: Core.Strapi }) => {`
- 第 261-313 行：工厂闭包内已有 `getUserEffectivePermissions` 函数
- 第 315 行：`return ({`
- 第 1012-1014 行：工厂方法 `getUserLevel` 委托给模块级函数

- [ ] **Step 2: 移动 4 个函数到工厂闭包内**

操作步骤：
1. 删除模块级的 4 个函数定义（第 69-187 行，包括注释）
2. 在工厂闭包内 `getUserEffectivePermissions` 函数之前（第 261 行之后），粘贴这 4 个函数定义
3. 确保函数内的 `strapi` 引用现在指向闭包参数

修改后的文件结构（伪代码）：

```typescript
import type { Core } from "@strapi/strapi";
import type { UserPermissions } from "../utils/types";
import { DEFAULT_ROLE_PERMISSIONS } from "../permissions";

const USER_UID = "plugin::users-permissions.user";

// ... helper 函数（throwErr, isProtected, invalidateUserCache, extractRoleNames）保持不变 ...

const PERMISSION_UID = "plugin::zhao-auth.permission";

// 注意：getRoleLevel, getUserLevel, computeOperatorOwnedRoles, resolveTenantUserIds
// 已移入下方工厂闭包内，因为它们引用 strapi 闭包参数

/**
 * 为用户角色标注来源（core/auto/explicit）
 * 此函数不直接引用 strapi，保留在模块级
 */
async function annotateUserRoles(user: any, _tenantDocumentId?: string) {
  // ... 内容不变 ...
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // ===== 移入的 4 个函数（原模块级，因引用 strapi 而移入闭包）=====

  /**
   * 获取角色层级（支持自定义角色，查 zhao_permissions 表）
   */
  async function getRoleLevel(role: string): Promise<number> {
    if (ROLE_HIERARCHY[role] != null) return ROLE_HIERARCHY[role];
    const roleRecord = await strapi.db.query(PERMISSION_UID).findOne({
      where: { role },
      select: ["level"],
    });
    return (roleRecord as any)?.level ?? 20;
  }

  /**
   * 获取用户层级（取用户所有角色中的最高层级）
   */
  async function getUserLevel(userId: number): Promise<number> {
    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
      select: ["zhaoRoles"],
      populate: ["role"],
    });
    if (!user) return 20;
    const roles = extractRoleNames(user);
    if (roles.length === 0) return 20;
    const levels = await Promise.all(roles.map(getRoleLevel));
    return Math.max(...levels);
  }

  /**
   * 计算操作者"拥有的角色全集"
   */
  async function computeOperatorOwnedRoles(
    operatorId: number,
    operatorTenantDocumentId?: string
  ): Promise<string[]> {
    const operator = await strapi.db.query(USER_UID).findOne({
      where: { id: operatorId },
      select: ["zhaoRoles"],
    });
    const operatorRoles: string[] = Array.isArray((operator as any)?.zhaoRoles)
      ? (operator as any).zhaoRoles
          .map((r: any) => (typeof r === "string" ? r : String(r)))
          .filter((r: string) => r && r.trim())
      : [];

    if (operatorRoles.includes("admin")) {
      const { ROLES } = await import("../permissions");
      return Object.values(ROLES);
    }

    const ownedSet = new Set<string>(operatorRoles);
    try {
      const moduleVisibility = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .resolveModuleVisibility(operatorTenantDocumentId);
      const { MODULE_MANAGER_MAP } = await import("../permissions");
      for (const [moduleKey, roles] of Object.entries(moduleVisibility)) {
        if ((roles as string[]).includes("channel-admin")) {
          const managerRole = (MODULE_MANAGER_MAP as any)[moduleKey];
          if (managerRole) {
            ownedSet.add(managerRole);
          }
        }
      }
    } catch {
      // resolveModuleVisibility 失败时不影响已有角色，仅忽略 auto 部分
    }
    return Array.from(ownedSet);
  }

  /**
   * 解析当前操作者渠道下的用户 ID 列表
   */
  async function resolveTenantUserIds(
    operatorId: number,
    _tenantDocumentId?: string
  ): Promise<number[] | null> {
    try {
      const operatorChannels = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { user: operatorId, isCurrent: true },
        populate: { channel: { select: ["id"] } },
      });
      const operatorChannelIds = operatorChannels
        .map((cm: any) => cm.channel?.id)
        .filter(Boolean);
      if (operatorChannelIds.length === 0) return null;

      const targetMembers = await strapi.db.query("plugin::zhao-channel.channel-member").findMany({
        where: { channel: { id: { $in: operatorChannelIds } } },
        populate: { user: { select: ["id"] } },
      });
      return targetMembers
        .map((m: any) => m.user?.id)
        .filter((id: any) => id != null) as number[];
    } catch {
      return null;
    }
  }

  // ===== 原有闭包内函数 =====

  async function getUserEffectivePermissions(userId: number): Promise<UserPermissions> {
    // ... 内容不变 ...
  }

  return ({
    // ... 所有工厂方法不变 ...

    // getUserLevel 方法委托闭包内函数（第 1012-1014 行不变）
    async getUserLevel(userId: number): Promise<number> {
      return getUserLevel(userId);  // 引用闭包内的 getUserLevel 函数声明
    },

    // ... 其他方法不变 ...
  });
};
```

**关键注意**：
- `getRoleLevel`、`getUserLevel`、`computeOperatorOwnedRoles`、`resolveTenantUserIds` 的函数体内容**完全不变**，只是位置从模块级移到闭包内
- `annotateUserRoles` 保留在模块级（不引用全局 strapi）
- 工厂方法 `getUserLevel` 的委托 `return getUserLevel(userId)` 不需要修改 —— JS 作用域规则保证它引用闭包内的函数声明

- [ ] **Step 3: 运行 TypeScript 编译验证**

Run: `cd strapi/plugins/zhao-auth && npx --no-install tsc --noEmit --project tsconfig.json 2>&1 | Select-Object -Last 20`
Expected: 无错误

- [ ] **Step 4: 运行测试验证 "strapi is not defined" 错误消失**

Run: `cd strapi/plugins/zhao-auth && npx --no-install jest --config tests/jest.config.ts --no-coverage --testPathPattern "role-management|role-model" 2>&1 | Select-Object -Last 30`
Expected: 涉及 assignRole/revokeRole/findUsers/getAssignableRoles 的测试不再报 "strapi is not defined"（可能有其他失败，但不是这个错误）

- [ ] **Step 5: Commit**

```bash
cd strapi/plugins/zhao-auth
git add server/src/services/role-management.service.ts
git commit -m "fix: move 4 module-level functions into factory closure to fix global strapi reference"
```

---

## Task 4: zhao-studio tsx 测试环境配置

**Files:**
- Modify: `strapi/plugins/zhao-studio/package.json`
- Modify: `strapi/plugins/zhao-studio/tests/jest.config.ts`
- Modify: `strapi/plugins/zhao-studio/tests/tsconfig.json`

- [ ] **Step 1: 安装测试依赖**

Run: `cd strapi/plugins/zhao-studio && npm install --save-dev @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.4.0 jest-environment-jsdom@^29.7.0`
Expected: 安装成功

- [ ] **Step 2: 修改 jest.config.ts 支持 tsx**

将 `tests/jest.config.ts` 修改为：

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['./helpers/strapi-setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
  },
};

export default config;
```

变更点：
- `testMatch` 加 `'**/*.test.tsx'`
- `moduleFileExtensions` 加 `'tsx'`

- [ ] **Step 3: 修改 tests/tsconfig.json 支持 jsx**

将 `tests/tsconfig.json` 修改为：

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "./dist",
    "types": ["node", "jest"],
    "jsx": "react-jsx"
  },
  "include": ["**/*"],
  "exclude": ["node_modules", "dist"]
}
```

变更点：加 `"jsx": "react-jsx"`

- [ ] **Step 4: 验证现有测试不受影响**

Run: `cd strapi/plugins/zhao-studio && npx --no-install jest --config tests/jest.config.ts --no-coverage 2>&1 | Select-Object -Last 20`
Expected: 现有 .test.ts 测试正常运行，无配置错误

- [ ] **Step 5: Commit**

```bash
cd strapi/plugins/zhao-studio
git add package.json package-lock.json tests/jest.config.ts tests/tsconfig.json
git commit -m "test: configure tsx test environment for zhao-studio"
```

---

## Task 5: zhao-studio 同步测试 + 复制文件加注释

**Files:**
- Create: `strapi/plugins/zhao-studio/tests/admin/permissions-parity.test.tsx`
- Modify: `strapi/plugins/zhao-studio/admin/src/context/PermissionsProvider.tsx`
- Modify: `strapi/plugins/zhao-studio/admin/src/components/PermissionGate.tsx`
- Modify: `strapi/plugins/zhao-studio/admin/src/hooks/useMyPermissions.ts`

- [ ] **Step 1: 为 3 个复制文件补充同步提醒注释**

在 `admin/src/context/PermissionsProvider.tsx` 文件头部注释中追加一行：

```typescript
// admin/src/context/PermissionsProvider.tsx
// 内部轻量版 PermissionsProvider：直接调用 zhao-auth 后端 /api/zhao-auth/v1/admin/me
// 跨插件 admin 代码无法直接 import（zhao-auth package.json 未导出 ./admin 路径），
// 因此在 zhao-studio 内部复制一份 Provider/Hook，复用同一后端 API。
// 同步测试：tests/admin/permissions-parity.test.tsx
// 修改 zhao-auth 权限组件时，请同步更新本文件和同步测试
```

在 `admin/src/components/PermissionGate.tsx` 文件头部追加注释：

```typescript
// admin/src/components/PermissionGate.tsx
// 同步测试：tests/admin/permissions-parity.test.tsx
// 修改 zhao-auth 权限组件时，请同步更新本文件和同步测试
```

在 `admin/src/hooks/useMyPermissions.ts` 文件头部追加注释：

```typescript
// admin/src/hooks/useMyPermissions.ts
// 同步测试：tests/admin/permissions-parity.test.tsx
// 修改 zhao-auth 权限组件时，请同步更新本文件和同步测试
```

- [ ] **Step 2: 创建同步测试文件**

创建 `tests/admin/permissions-parity.test.tsx`：

```typescript
/**
 * @jest-environment jsdom
 *
 * 权限组件同步测试
 *
 * 此测试验证 zhao-studio 中复制的权限组件（PermissionsProvider / PermissionGate / PermissionButton）
 * 的预期行为。这些组件从 zhao-auth 复制而来，当 zhao-auth 修改权限组件行为时，
 * 开发者需同步更新 zhao-studio 的复制代码和此测试的预期。
 *
 * 修改 zhao-auth 权限组件时的检查清单：
 * 1. 同步更新 zhao-studio/admin/src/context/PermissionsProvider.tsx
 * 2. 同步更新 zhao-studio/admin/src/components/PermissionGate.tsx
 * 3. 同步更新此测试的预期行为
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionsProvider, useMyPermissions } from '../../admin/src/context/PermissionsProvider';
import { PermissionGate, PermissionButton } from '../../admin/src/components/PermissionGate';

// mock fetchMyInfo 返回固定权限集
const mockPermissions = ['zhao-studio.read', 'zhao-studio.collect-source.manage'];
const mockFetchResponse = {
  permissions: mockPermissions,
  channelScope: { all: false, channelIds: ['ch1'] },
  tenant: { documentId: 'tenant1' },
  user: { id: 1, username: 'testuser', zhaoRoles: ['plugin-manager'] },
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockFetchResponse,
  }) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PermissionsProvider 行为验证', () => {
  it('加载后提供 permissions/channelScope/tenant/user', async () => {
    let captured: any = null;
    const TestChild: React.FC = () => {
      const ctx = useMyPermissions();
      captured = ctx;
      return null;
    };

    render(
      <PermissionsProvider>
        <TestChild />
      </PermissionsProvider>
    );

    // 等待 fetch 完成
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(captured.permissions).toEqual(mockPermissions);
    expect(captured.channelScope).toEqual({ all: false, channelIds: ['ch1'] });
    expect(captured.tenant).toEqual({ documentId: 'tenant1' });
    expect(captured.user).toEqual({ id: 1, username: 'testuser', zhaoRoles: ['plugin-manager'] });
    expect(captured.loading).toBe(false);
    expect(captured.error).toBeNull();
  });

  it('hasPermission 对存在的权限返回 true', async () => {
    let hasResult: boolean | undefined;
    const TestChild: React.FC = () => {
      const { hasPermission } = useMyPermissions();
      hasResult = hasPermission('zhao-studio.read');
      return null;
    };

    render(
      <PermissionsProvider>
        <TestChild />
      </PermissionsProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(hasResult).toBe(true);
  });

  it('hasPermission 对不存在的权限返回 false', async () => {
    let hasResult: boolean | undefined;
    const TestChild: React.FC = () => {
      const { hasPermission } = useMyPermissions();
      hasResult = hasPermission('zhao-studio.unknown');
      return null;
    };

    render(
      <PermissionsProvider>
        <TestChild />
      </PermissionsProvider>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(hasResult).toBe(false);
  });
});

describe('PermissionGate 行为验证', () => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionsProvider>{children}</PermissionsProvider>
  );

  it('有权限时渲染 children', async () => {
    render(
      <Wrapper>
        <PermissionGate action="zhao-studio.read">
          <div data-testid="content">内容</div>
        </PermissionGate>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('无权限时不渲染 children（mode=hide）', async () => {
    render(
      <Wrapper>
        <PermissionGate action="zhao-studio.unknown">
          <div data-testid="hidden-content">隐藏内容</div>
        </PermissionGate>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByTestId('hidden-content')).not.toBeInTheDocument();
  });

  it('无权限时渲染 fallback', async () => {
    render(
      <Wrapper>
        <PermissionGate action="zhao-studio.unknown" fallback={<div data-testid="fallback">无权限</div>}>
          <div data-testid="content">内容</div>
        </PermissionGate>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });
});

describe('PermissionButton 行为验证', () => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PermissionsProvider>{children}</PermissionsProvider>
  );

  it('有权限时按钮可点击', async () => {
    render(
      <Wrapper>
        <PermissionButton action="zhao-studio.read" data-testid="btn">
          按钮
        </PermissionButton>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    const btn = screen.getByTestId('btn');
    expect(btn).not.toBeDisabled();
  });

  it('无权限时按钮禁用', async () => {
    render(
      <Wrapper>
        <PermissionButton action="zhao-studio.unknown" data-testid="btn">
          按钮
        </PermissionButton>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    const btn = screen.getByTestId('btn');
    expect(btn).toBeDisabled();
  });

  it('无权限且 hideIfNoPermission 时不渲染按钮', async () => {
    render(
      <Wrapper>
        <PermissionButton action="zhao-studio.unknown" hideIfNoPermission data-testid="btn">
          按钮
        </PermissionButton>
      </Wrapper>
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByTestId('btn')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行同步测试验证通过**

Run: `cd strapi/plugins/zhao-studio && npx --no-install jest tests/admin/permissions-parity.test.tsx --config tests/jest.config.ts --no-coverage 2>&1 | Select-Object -Last 30`
Expected: 全部测试通过（8 个用例）

- [ ] **Step 4: Commit**

```bash
cd strapi/plugins/zhao-studio
git add tests/admin/permissions-parity.test.tsx admin/src/context/PermissionsProvider.tsx admin/src/components/PermissionGate.tsx admin/src/hooks/useMyPermissions.ts
git commit -m "test: add permissions parity test and sync reminders for copied auth components"
```

---

## Task 6: addMenuLink permissions 前缀修复

**Files:**
- Modify: `strapi/plugins/zhao-studio/admin/src/index.ts`
- Modify: `strapi/plugins/zhao-auth/admin/src/index.ts`

- [ ] **Step 1: 修改 zhao-studio/admin/src/index.ts**

将第 15 行：
```typescript
          action: 'plugin::zhao-studio.read',
```
改为：
```typescript
          action: 'zhao-studio.read',
```

- [ ] **Step 2: 修改 zhao-auth/admin/src/index.ts**

将第 16 行：
```typescript
      permissions: [{ action: 'plugin::zhao-auth.user.manage', subject: null }],
```
改为：
```typescript
      permissions: [{ action: 'zhao-auth.user.manage', subject: null }],
```

- [ ] **Step 3: 构建 2 个插件验证**

Run: `cd strapi/plugins/zhao-studio && npm run build`
Expected: build 成功

Run: `cd strapi/plugins/zhao-auth && npm run build`
Expected: build 成功

- [ ] **Step 4: Commit**

```bash
cd strapi/plugins/zhao-studio
git add admin/src/index.ts
git commit -m "fix: remove plugin:: prefix from addMenuLink permissions action"

cd ../zhao-auth
git add admin/src/index.ts
git commit -m "fix: remove plugin:: prefix from addMenuLink permissions action"
```

---

## Task 7: 全量构建和测试验证

**Files:**
- 无新文件，仅验证

- [ ] **Step 1: zhao-auth 全量测试**

Run: `cd strapi/plugins/zhao-auth && npx --no-install jest --config tests/jest.config.ts --no-coverage 2>&1 | Select-Object -Last 30`
Expected:
- 删除 6 个废弃测试文件后，测试总数减少
- role-management 相关测试不再报 "strapi is not defined"
- 剩余失败（如有）为其他预存问题

- [ ] **Step 2: zhao-studio 全量测试**

Run: `cd strapi/plugins/zhao-studio && npx --no-install jest --config tests/jest.config.ts --no-coverage 2>&1 | Select-Object -Last 30`
Expected:
- 现有 .test.ts 测试不受 tsx 配置影响
- 新增 permissions-parity.test.tsx 全部通过

- [ ] **Step 3: zhao-auth build**

Run: `cd strapi/plugins/zhao-auth && npm run build`
Expected: build 成功

- [ ] **Step 4: zhao-studio build**

Run: `cd strapi/plugins/zhao-studio && npm run build`
Expected: build 成功

- [ ] **Step 5: zhao-deal build（回归验证）**

Run: `cd strapi/plugins/zhao-deal && npm run build`
Expected: build 成功（不受本次改动影响）

- [ ] **Step 6: zhao-track build（回归验证）**

Run: `cd strapi/plugins/zhao-track && npm run build`
Expected: build 成功（不受本次改动影响）

- [ ] **Step 7: 最终 commit（如有遗漏的改动）**

```bash
cd strapi
git status
# 如有未提交的改动
git add -A
git commit -m "chore: final verification cleanup for tech debt cleanup"
```

---

## Self-Review

### 1. Spec coverage

| Spec 章节 | 覆盖 Task | 状态 |
|-----------|----------|------|
| §2.1 废弃模块评估 | Task 1 | ✅ 删除 6 个测试文件 |
| §2.2 删除测试文件清单 | Task 1 | ✅ 6 个文件全部列出 |
| §2.3 policies/index.ts 清理 | Task 2 | ✅ 移除废弃注释 |
| §2.4 role-management 修复 | Task 3 | ✅ 4 个函数移入闭包 |
| §3.3 tsx 测试环境配置 | Task 4 | ✅ package.json + jest.config + tsconfig |
| §3.4 同步测试设计 | Task 5 | ✅ 8 个测试用例 |
| §3.4 复制文件加注释 | Task 5 Step 1 | ✅ 3 个文件 |
| §4.3 addMenuLink 前缀修复 | Task 6 | ✅ 2 个文件各 1 行 |
| §6 测试策略 | Task 7 | ✅ 全量验证 |
| §8 风险缓解 | Task 3/4/7 | ✅ 委托验证 + 回归测试 |

### 2. Placeholder scan

- 无 "TBD"、"TODO"、"implement later"
- 无 "add appropriate error handling"
- 每个 step 都有具体代码或具体命令
- ✅ 通过

### 3. Type consistency

- `PermissionsProvider` / `useMyPermissions` / `PermissionGate` / `PermissionButton` 名称在 Task 5 测试代码和 spec §3.4 中一致
- `getRoleLevel` / `getUserLevel` / `computeOperatorOwnedRoles` / `resolveTenantUserIds` 函数名在 Task 3 和 spec §2.4 中一致
- `jest.config.ts` 配置项在 Task 4 和 spec §3.3 中一致
- ✅ 通过
