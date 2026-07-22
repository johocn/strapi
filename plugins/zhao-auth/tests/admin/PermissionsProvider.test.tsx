/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionsProvider, useMyPermissions } from '../../admin/src/context/PermissionsProvider';

jest.mock('../../admin/src/api', () => ({
  fetchMyInfo: jest.fn().mockResolvedValue({
    user: { id: 1, username: 'admin', zhaoRoles: ['ADMIN'] },
    permissions: ['zhao-deal.coupon.manage', 'zhao-studio.promo-channel.manage'],
    channelScope: { all: true, channelIds: [] },
    tenant: { documentId: 'tenant-1' },
  }),
}));

const TestChild = () => {
  const { permissions, hasPermission, loading } = useMyPermissions();
  if (loading) return <div>Loading</div>;
  return (
    <div>
      <span data-testid="perm-count">{permissions.length}</span>
      <span data-testid="has-coupon">{hasPermission('zhao-deal.coupon.manage') ? 'yes' : 'no'}</span>
      <span data-testid="has-other">{hasPermission('other.action') ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('PermissionsProvider', () => {
  it('provides permissions to children', async () => {
    render(
      <PermissionsProvider>
        <TestChild />
      </PermissionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('perm-count')).toHaveTextContent('2');
      expect(screen.getByTestId('has-coupon')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-other')).toHaveTextContent('no');
    });
  });
});
