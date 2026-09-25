import { PERMISSIONS } from '../server/src/permissions';

describe('活动域权限码', () => {
  const editBase = [
    'activity.read', 'activity.create', 'activity.update',
    'series.read', 'series.create', 'series.update',
  ];
  const deleteOnly = ['activity.delete', 'series.delete'];

  test('全部活动/系列权限码均已定义', () => {
    for (const key of [...editBase, ...deleteOnly]) {
      expect(PERMISSIONS[key]).toBeDefined();
    }
  });

  test('每项权限都允许 admin（否则 admin 之外无人兜底）', () => {
    for (const key of [...editBase, ...deleteOnly]) {
      expect(PERMISSIONS[key].allowRoles).toContain('admin');
    }
  });

  test('delete 类仅 admin / channel-admin', () => {
    for (const key of deleteOnly) {
      expect(PERMISSIONS[key].allowRoles).toEqual(['admin', 'channel-admin']);
    }
  });

  test('读与编辑类含 plugin-manager', () => {
    for (const key of editBase) {
      expect(PERMISSIONS[key].allowRoles).toContain('plugin-manager');
    }
  });

  test('活动域权限不开放给 user 角色', () => {
    for (const key of [...editBase, ...deleteOnly]) {
      expect(PERMISSIONS[key].allowRoles).not.toContain('user');
    }
  });
});