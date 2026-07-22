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
import { render, screen, waitFor } from '@testing-library/react';
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
    await waitFor(() => {
      expect(captured?.permissions).toEqual(mockPermissions);
    });

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
