import { PERMISSIONS } from '../server/src/permissions';

/** 统一取值口径：PERMISSIONS 的值为 { allowRoles } 结构（历史曾是字符串数组） */
const rolesOf = (permission: string): string[] => PERMISSIONS[permission]?.allowRoles ?? [];

describe('权限定义测试', () => {
  describe('PERMISSIONS 配置结构', () => {
    test('PERMISSIONS 是一个对象', () => {
      expect(typeof PERMISSIONS).toBe('object');
      expect(PERMISSIONS).not.toBeNull();
    });

    test('所有权限定义都是字符串数组', () => {
      Object.entries(PERMISSIONS).forEach(([key, value]) => {
        expect(Array.isArray(value.allowRoles)).toBe(true);
        expect(value.allowRoles.every(role => typeof role === 'string')).toBe(true);
      });
    });
  });

  describe('积分配置权限', () => {
    test('point-config.read 权限配置正确', () => {
      expect(rolesOf('point-config.read')).toContain('admin');
      expect(rolesOf('point-config.read')).toContain('channel-admin');
      expect(rolesOf('point-config.read')).toContain('plugin-manager');
      expect(rolesOf('point-config.read')).not.toContain('user');
    });

    test('point-config.update 权限配置正确', () => {
      expect(rolesOf('point-config.update')).toContain('admin');
      expect(rolesOf('point-config.update')).toContain('channel-admin');
      expect(rolesOf('point-config.update')).not.toContain('plugin-manager');
    });
  });

  describe('积分规则权限', () => {
    test('point-rule.create 权限配置正确', () => {
      expect(rolesOf('point-rule.create')).toContain('admin');
      expect(rolesOf('point-rule.create')).toContain('channel-admin');
      expect(rolesOf('point-rule.create')).toContain('plugin-manager');
    });

    test('point-rule.read 权限配置正确', () => {
      expect(rolesOf('point-rule.read')).toContain('admin');
      expect(rolesOf('point-rule.read')).toContain('channel-admin');
      expect(rolesOf('point-rule.read')).toContain('plugin-manager');
    });

    test('point-rule.update 权限配置正确', () => {
      expect(rolesOf('point-rule.update')).toContain('admin');
      expect(rolesOf('point-rule.update')).toContain('channel-admin');
      expect(rolesOf('point-rule.update')).toContain('plugin-manager');
    });

    test('point-rule.delete 权限配置正确', () => {
      expect(rolesOf('point-rule.delete')).toContain('admin');
      expect(rolesOf('point-rule.delete')).toContain('channel-admin');
      expect(rolesOf('point-rule.delete')).not.toContain('plugin-manager');
    });
  });

  describe('积分操作权限', () => {
    test('point.grant 权限配置正确', () => {
      expect(rolesOf('point.grant')).toContain('admin');
      expect(rolesOf('point.grant')).toContain('channel-admin');
      expect(rolesOf('point.grant')).toContain('plugin-manager');
      expect(rolesOf('point.grant')).not.toContain('user');
    });

    test('point.read 权限配置正确', () => {
      expect(rolesOf('point.read')).toContain('admin');
      expect(rolesOf('point.read')).toContain('channel-admin');
      expect(rolesOf('point.read')).toContain('plugin-manager');
      expect(rolesOf('point.read')).toContain('user');
    });
  });

  describe('积分兑换权限', () => {
    test('point-redeem 权限配置正确', () => {
      expect(rolesOf('point-redeem')).toEqual(['user']);
    });

    test('point-record.read 权限配置正确', () => {
      expect(rolesOf('point-record.read')).toContain('admin');
      expect(rolesOf('point-record.read')).toContain('channel-admin');
      expect(rolesOf('point-record.read')).toContain('plugin-manager');
      expect(rolesOf('point-record.read')).toContain('user');
    });
  });

  describe('商品管理权限', () => {
    test('point-product.read 权限配置正确', () => {
      expect(rolesOf('point-product.read')).toContain('admin');
      expect(rolesOf('point-product.read')).toContain('channel-admin');
      expect(rolesOf('point-product.read')).toContain('plugin-manager');
      expect(rolesOf('point-product.read')).toContain('instructor');
      expect(rolesOf('point-product.read')).toContain('user');
    });

    test('point-product.create 权限配置正确', () => {
      expect(rolesOf('point-product.create')).toContain('admin');
      expect(rolesOf('point-product.create')).toContain('channel-admin');
      expect(rolesOf('point-product.create')).toContain('plugin-manager');
      expect(rolesOf('point-product.create')).not.toContain('user');
    });

    test('point-product.update 权限配置正确', () => {
      expect(rolesOf('point-product.update')).toContain('admin');
      expect(rolesOf('point-product.update')).toContain('channel-admin');
      expect(rolesOf('point-product.update')).toContain('plugin-manager');
      expect(rolesOf('point-product.update')).not.toContain('user');
    });

    test('point-product.delete 权限配置正确', () => {
      expect(rolesOf('point-product.delete')).toContain('admin');
      expect(rolesOf('point-product.delete')).toContain('channel-admin');
      expect(rolesOf('point-product.delete')).not.toContain('plugin-manager');
    });
  });

  describe('兑换审核权限', () => {
    test('point-redemption.approve 权限配置正确', () => {
      expect(rolesOf('point-redemption.approve')).toContain('admin');
      expect(rolesOf('point-redemption.approve')).toContain('channel-admin');
      expect(rolesOf('point-redemption.approve')).toContain('plugin-manager');
    });

    test('point-redemption.read 权限配置正确', () => {
      expect(rolesOf('point-redemption.read')).toContain('admin');
      expect(rolesOf('point-redemption.read')).toContain('channel-admin');
      expect(rolesOf('point-redemption.read')).toContain('plugin-manager');
      expect(rolesOf('point-redemption.read')).toContain('user');
    });
  });

  describe('权限完整性检查', () => {
    test('所有必需的权限都已定义', () => {
      const requiredPermissions = [
        'point-config.read',
        'point-config.update',
        'point-rule.create',
        'point-rule.read',
        'point-rule.update',
        'point-rule.delete',
        'point.grant',
        'point.read',
        'point-redeem',
        'point-record.read',
        'point-product.read',
        'point-product.create',
        'point-product.update',
        'point-product.delete',
        'point-redemption.approve',
        'point-redemption.read',
        'activity.read',
        'activity.create',
        'activity.update',
        'activity.delete',
        'pickup-location.read',
        'pickup-location.create',
        'pickup-location.update',
        'pickup-location.delete',
        'series.read',
        'series.create',
        'series.update',
        'series.delete',
      ];

      const keys = Object.keys(PERMISSIONS);
      requiredPermissions.forEach(permission => {
        expect(keys).toContain(permission);
      });
    });

    test('没有重复的权限定义', () => {
      const keys = Object.keys(PERMISSIONS);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });
});

describe('角色层级测试', () => {
  const validRoles = ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'];

  // 用户专属权限：仅面向 C 端点发，管理员不应具备（如积分兑换由用户发起）
  // 注意：新增此类权限时必须登记到此清单，否则下方「admin 覆盖」用例会失败（这是有意的守卫）
  const USER_ONLY_PERMISSIONS = ['point-redeem'];

  test('所有权限中的角色都是有效的', () => {
    Object.values(PERMISSIONS).forEach(({ allowRoles }) => {
      allowRoles.forEach(role => {
        expect(validRoles).toContain(role);
      });
    });
  });

  test('admin 角色拥有除用户专属权限外的所有权限', () => {
    Object.entries(PERMISSIONS)
      .filter(([permission]) => !USER_ONLY_PERMISSIONS.includes(permission))
      .forEach(([permission, { allowRoles }]) => {
        expect(allowRoles).toContain('admin');
      });
  });

  test('用户专属权限确实只授予 user', () => {
    USER_ONLY_PERMISSIONS.forEach(permission => {
      expect(PERMISSIONS[permission]?.allowRoles).toEqual(['user']);
    });
  });

  test('user 角色权限最少', () => {
    const userPermissions = Object.entries(PERMISSIONS)
      .filter(([_, entry]) => entry.allowRoles.includes('user'))
      .map(([permission]) => permission);

    expect(userPermissions).toContain('point.read');
    expect(userPermissions).toContain('point-redeem');
    expect(userPermissions).toContain('point-record.read');
    expect(userPermissions).toContain('point-product.read');
    expect(userPermissions).toContain('point-redemption.read');
  });
});