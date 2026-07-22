import { PERMISSION_TREE, DEFAULT_ROLE_PERMISSIONS, flattenPermissions } from '../server/src/permissions';

describe('PERMISSION_TREE completion', () => {
  const allActions = flattenPermissions(PERMISSION_TREE);

  it('includes zhao-deal subtree with 16 actions', () => {
    const dealActions = allActions.filter(a => a.startsWith('zhao-deal.'));
    expect(dealActions).toContain('zhao-deal.platform.manage');
    expect(dealActions).toContain('zhao-deal.coupon.manage');
    expect(dealActions).toContain('zhao-deal.coupon.view');
    expect(dealActions).toContain('zhao-deal.coupon.approve');
    expect(dealActions).toContain('zhao-deal.coupon-collection.manage');
    expect(dealActions).toContain('zhao-deal.coupon-collection.publish');
    expect(dealActions).toContain('zhao-deal.coupon-candidate.manage');
    expect(dealActions).toContain('zhao-deal.coupon-candidate.view');
    expect(dealActions).toContain('zhao-deal.coupon-candidate.approve');
    expect(dealActions).toContain('zhao-deal.product.manage');
    expect(dealActions).toContain('zhao-deal.product.view');
    expect(dealActions).toContain('zhao-deal.product-candidate.manage');
    expect(dealActions).toContain('zhao-deal.product-candidate.view');
    expect(dealActions).toContain('zhao-deal.product-candidate.approve');
    expect(dealActions).toContain('zhao-deal.category.manage');
    expect(dealActions).toContain('zhao-deal.sync.trigger');
    expect(dealActions.filter(a => a.startsWith('zhao-deal.')).length).toBe(16);
  });

  it('includes zhao-track subtree with 6 actions', () => {
    const trackActions = allActions.filter(a => a.startsWith('zhao-track.'));
    expect(trackActions).toContain('zhao-track.source-tag.manage');
    expect(trackActions).toContain('zhao-track.click-event.manage');
    expect(trackActions).toContain('zhao-track.click-event.view');
    expect(trackActions).toContain('zhao-track.order.manage');
    expect(trackActions).toContain('zhao-track.order.view');
    expect(trackActions).toContain('zhao-track.sync.schedule');
    expect(trackActions.length).toBe(6);
  });

  it('includes zhao-studio promo subtree with 7 actions', () => {
    const studioPromo = allActions.filter(a => a.startsWith('zhao-studio.promo-') || a.startsWith('zhao-studio.ab-experiment.') || a.startsWith('zhao-studio.channel-report.'));
    expect(studioPromo).toContain('zhao-studio.promo-channel.manage');
    expect(studioPromo).toContain('zhao-studio.promo-channel.archive');
    expect(studioPromo).toContain('zhao-studio.promo-campaign.manage');
    expect(studioPromo).toContain('zhao-studio.ab-experiment.manage');
    expect(studioPromo).toContain('zhao-studio.ab-experiment.start');
    expect(studioPromo).toContain('zhao-studio.ab-experiment.stop');
    expect(studioPromo).toContain('zhao-studio.channel-report.view');
    expect(studioPromo.length).toBe(7);
  });

  it('includes zhao-auth subtree with 6 actions', () => {
    const authActions = allActions.filter(a => a.startsWith('zhao-auth.'));
    expect(authActions).toContain('zhao-auth.user.manage');
    expect(authActions).toContain('zhao-auth.role.assign');
    expect(authActions).toContain('zhao-auth.role.batch-assign');
    expect(authActions).toContain('zhao-auth.permission.matrix.edit');
    expect(authActions).toContain('zhao-auth.audit-log.view');
    expect(authActions).toContain('zhao-auth.permission.check');
    expect(authActions.length).toBe(6);
  });

  it('admin role has all permissions including new subtrees', () => {
    const adminPerms = DEFAULT_ROLE_PERMISSIONS.ADMIN || DEFAULT_ROLE_PERMISSIONS.admin || [];
    // admin should have all zhao-deal actions
    expect(adminPerms).toContain('zhao-deal.coupon.manage');
    expect(adminPerms).toContain('zhao-track.click-event.manage');
    expect(adminPerms).toContain('zhao-studio.promo-channel.manage');
    expect(adminPerms).toContain('zhao-auth.user.manage');
  });

  it('channel-admin does NOT have zhao-deal/zhao-track manage permissions', () => {
    const caPerms = DEFAULT_ROLE_PERMISSIONS.CHANNEL_ADMIN || DEFAULT_ROLE_PERMISSIONS['channel-admin'] || [];
    expect(caPerms).not.toContain('zhao-deal.coupon.manage');
    expect(caPerms).not.toContain('zhao-track.click-event.manage');
    // but should have studio promo manage
    expect(caPerms).toContain('zhao-studio.promo-channel.manage');
    expect(caPerms).toContain('zhao-studio.channel-report.view');
  });

  it('instructor has view-only permissions for deal/track', () => {
    const instPerms = DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR || DEFAULT_ROLE_PERMISSIONS.instructor || [];
    expect(instPerms).toContain('zhao-deal.coupon.view');
    expect(instPerms).toContain('zhao-deal.product.view');
    expect(instPerms).toContain('zhao-track.click-event.view');
    expect(instPerms).toContain('zhao-track.order.view');
    expect(instPerms).toContain('zhao-studio.channel-report.view');
    expect(instPerms).toContain('zhao-studio.stat-summary.view');
    // instructor should NOT have manage permissions
    expect(instPerms).not.toContain('zhao-deal.coupon.manage');
    expect(instPerms).not.toContain('zhao-track.click-event.manage');
  });

  it('has __version field in DEFAULT_ROLE_PERMISSIONS', () => {
    expect((DEFAULT_ROLE_PERMISSIONS as any).__version).toBe('2026-07-22');
  });
});
