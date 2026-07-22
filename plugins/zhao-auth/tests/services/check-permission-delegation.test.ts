describe('checkPermission delegation', () => {
  it('delegates to permission.service.getMyPermissions', async () => {
    const mockGetMyPermissions = jest.fn().mockResolvedValue(['zhao-deal.coupon.manage']);
    const mockStrapi = {
      plugin: jest.fn(() => ({
        service: jest.fn(() => ({
          getMyPermissions: mockGetMyPermissions,
        })),
      })),
    };

    const { checkPermission } = require('../../server/src/services/role-management.service');
    const result = await checkPermission.call({ strapi: mockStrapi }, 1, 'zhao-deal.coupon.manage');

    expect(mockGetMyPermissions).toHaveBeenCalledWith(1, undefined);
    expect(result).toBe(true);
  });

  it('returns false when action not in permissions', async () => {
    const mockGetMyPermissions = jest.fn().mockResolvedValue(['other.action']);
    const mockStrapi = {
      plugin: jest.fn(() => ({
        service: jest.fn(() => ({
          getMyPermissions: mockGetMyPermissions,
        })),
      })),
    };

    const { checkPermission } = require('../../server/src/services/role-management.service');
    const result = await checkPermission.call({ strapi: mockStrapi }, 1, 'zhao-deal.coupon.manage');

    expect(result).toBe(false);
  });
});
