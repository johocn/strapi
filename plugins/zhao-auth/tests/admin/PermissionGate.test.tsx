/**
 * @jest-environment jsdom
 */
// tests/admin/PermissionGate.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionGate, PermissionButton } from '../../admin/src/components/PermissionGate';
import { PermissionsProvider } from '../../admin/src/context/PermissionsProvider';

jest.mock('../../admin/src/api', () => ({
  fetchMyInfo: jest.fn().mockResolvedValue({
    user: { id: 1, username: 'admin', zhaoRoles: ['ADMIN'] },
    permissions: ['zhao-deal.coupon.manage'],
    channelScope: { all: true, channelIds: [] },
    tenant: null,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PermissionsProvider>{children}</PermissionsProvider>
);

describe('PermissionGate', () => {
  it('renders children when has permission', async () => {
    render(
      <PermissionGate action="zhao-deal.coupon.manage">
        <div data-testid="content">Content</div>
      </PermissionGate>,
      { wrapper }
    );
    await screen.findByTestId('content');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('hides children when no permission', async () => {
    render(
      <PermissionGate action="other.action">
        <div data-testid="hidden">Hidden</div>
      </PermissionGate>,
      { wrapper }
    );
    await new Promise(r => setTimeout(r, 100));
    expect(screen.queryByTestId('hidden')).not.toBeInTheDocument();
  });

  it('shows fallback when no permission', async () => {
    render(
      <PermissionGate action="other.action" fallback={<div>No permission</div>}>
        <div>Content</div>
      </PermissionGate>,
      { wrapper }
    );
    await screen.findByText('No permission');
    expect(screen.getByText('No permission')).toBeInTheDocument();
  });

  it('supports OR logic with multiple actions', async () => {
    render(
      <PermissionGate action={['other.action', 'zhao-deal.coupon.manage']}>
        <div data-testid="or-content">OR Content</div>
      </PermissionGate>,
      { wrapper }
    );
    await screen.findByTestId('or-content');
    expect(screen.getByTestId('or-content')).toBeInTheDocument();
  });
});
