import { PERMISSIONS } from '../server/src/permissions';

describe('权限定义测试', () => {
  describe('PERMISSIONS 配置结构', () => {
    test('PERMISSIONS 是一个对象', () => {
      expect(typeof PERMISSIONS).toBe('object');
      expect(PERMISSIONS).not.toBeNull();
    });

    test('所有权限定义都是字符串数组', () => {
      Object.entries(PERMISSIONS).forEach(([key, value]) => {
        expect(Array.isArray(value)).toBe(true);
        expect(value.every(role => typeof role === 'string')).toBe(true);
      });
    });
  });

  describe('积分配置权限', () => {
    test('point-config.read 权限配置正确', () => {
      expect(PERMISSIONS['point-config.read']).toContain('admin');
      expect(PERMISSIONS['point-config.read']).toContain('channel-admin');
      expect(PERMISSIONS['point-config.read']).toContain('plugin-manager');
      expect(PERMISSIONS['point-config.read']).not.toContain('user');
    });

    test('point-config.update 权限配置正确', () => {
      expect(PERMISSIONS['point-config.update']).toContain('admin');
      expect(PERMISSIONS['point-config.update']).toContain('channel-admin');
      expect(PERMISSIONS['point-config.update']).not.toContain('plugin-manager');
    });
  });

  describe('积分规则权限', () => {
    test('point-rule.create 权限配置正确', () => {
      expect(PERMISSIONS['point-rule.create']).toContain('admin');
      expect(PERMISSIONS['point-rule.create']).toContain('channel-admin');
      expect(PERMISSIONS['point-rule.create']).toContain('plugin-manager');
    });

    test('point-rule.read 权限配置正确', () => {
      expect(PERMISSIONS['point-rule.read']).toContain('admin');
      expect(PERMISSIONS['point-rule.read']).toContain('channel-admin');
      expect(PERMISSIONS['point-rule.read']).toContain('plugin-manager');
    });

    test('point-rule.update 权限配置正确', () => {
      expect(PERMISSIONS['point-rule.update']).toContain('admin');
      expect(PERMISSIONS['point-rule.update']).toContain('channel-admin');
      expect(PERMISSIONS['point-rule.update']).toContain('plugin-manager');
    });

    test('point-rule.delete 权限配置正确', () => {
      expect(PERMISSIONS['point-rule.delete']).toContain('admin');
      expect(PERMISSIONS['point-rule.delete']).toContain('channel-admin');
      expect(PERMISSIONS['point-rule.delete']).not.toContain('plugin-manager');
    });
  });

  describe('积分操作权限', () => {
    test('point.grant 权限配置正确', () => {
      expect(PERMISSIONS['point.grant']).toContain('admin');
      expect(PERMISSIONS['point.grant']).toContain('channel-admin');
      expect(PERMISSIONS['point.grant']).toContain('plugin-manager');
      expect(PERMISSIONS['point.grant']).not.toContain('user');
    });

    test('point.read 权限配置正确', () => {
      expect(PERMISSIONS['point.read']).toContain('admin');
      expect(PERMISSIONS['point.read']).toContain('channel-admin');
      expect(PERMISSIONS['point.read']).toContain('plugin-manager');
      expect(PERMISSIONS['point.read']).toContain('user');
    });
  });

  describe('积分兑换权限', () => {
    test('point-redeem 权限配置正确', () => {
      expect(PERMISSIONS['point-redeem']).toEqual(['user']);
    });

    test('point-record.read 权限配置正确', () => {
      expect(PERMISSIONS['point-record.read']).toContain('admin');
      expect(PERMISSIONS['point-record.read']).toContain('channel-admin');
      expect(PERMISSIONS['point-record.read']).toContain('plugin-manager');
      expect(PERMISSIONS['point-record.read']).toContain('user');
    });
  });

  describe('商品管理权限', () => {
    test('point-product.read 权限配置正确', () => {
      expect(PERMISSIONS['point-product.read']).toContain('admin');
      expect(PERMISSIONS['point-product.read']).toContain('channel-admin');
      expect(PERMISSIONS['point-product.read']).toContain('plugin-manager');
      expect(PERMISSIONS['point-product.read']).toContain('instructor');
      expect(PERMISSIONS['point-product.read']).toContain('user');
    });

    test('point-product.create 权限配置正确', () => {
      expect(PERMISSIONS['point-product.create']).toContain('admin');
      expect(PERMISSIONS['point-product.create']).toContain('channel-admin');
      expect(PERMISSIONS['point-product.create']).toContain('plugin-manager');
      expect(PERMISSIONS['point-product.create']).not.toContain('user');
    });

    test('point-product.update 权限配置正确', () => {
      expect(PERMISSIONS['point-product.update']).toContain('admin');
      expect(PERMISSIONS['point-product.update']).toContain('channel-admin');
      expect(PERMISSIONS['point-product.update']).toContain('plugin-manager');
      expect(PERMISSIONS['point-product.update']).not.toContain('user');
    });

    test('point-product.delete 权限配置正确', () => {
      expect(PERMISSIONS['point-product.delete']).toContain('admin');
      expect(PERMISSIONS['point-product.delete']).toContain('channel-admin');
      expect(PERMISSIONS['point-product.delete']).not.toContain('plugin-manager');
    });
  });

  describe('兑换审核权限', () => {
    test('point-redemption.approve 权限配置正确', () => {
      expect(PERMISSIONS['point-redemption.approve']).toContain('admin');
      expect(PERMISSIONS['point-redemption.approve']).toContain('channel-admin');
      expect(PERMISSIONS['point-redemption.approve']).toContain('plugin-manager');
    });

    test('point-redemption.read 权限配置正确', () => {
      expect(PERMISSIONS['point-redemption.read']).toContain('admin');
      expect(PERMISSIONS['point-redemption.read']).toContain('channel-admin');
      expect(PERMISSIONS['point-redemption.read']).toContain('plugin-manager');
      expect(PERMISSIONS['point-redemption.read']).toContain('user');
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
      ];

      requiredPermissions.forEach(permission => {
        expect(PERMISSIONS).toHaveProperty(permission);
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

  test('所有权限中的角色都是有效的', () => {
    Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
      roles.forEach(role => {
        expect(validRoles).toContain(role);
      });
    });
  });

  test('admin 角色拥有所有权限', () => {
    Object.entries(PERMISSIONS).forEach(([permission, roles]) => {
      expect(roles).toContain('admin');
    });
  });

  test('user 角色权限最少', () => {
    const userPermissions = Object.entries(PERMISSIONS)
      .filter(([_, roles]) => roles.includes('user'))
      .map(([permission]) => permission);

    expect(userPermissions).toContain('point.read');
    expect(userPermissions).toContain('point-redeem');
    expect(userPermissions).toContain('point-record.read');
    expect(userPermissions).toContain('point-product.read');
    expect(userPermissions).toContain('point-redemption.read');
  });
});
