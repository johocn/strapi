const permissionMapping: Record<string, string[]> = {
  'oss.file.upload': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
  'oss.file.read': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
  'oss.file.delete': ['admin', 'channel-admin'],
  'oss.folder.create': ['admin', 'channel-admin', 'course-manager'],
  'oss.folder.read': ['admin', 'channel-admin', 'course-manager', 'instructor', 'user'],
  'oss.settings.read': ['admin'],
  'oss.settings.update': ['admin'],
  'oss.sync.read': ['admin', 'channel-admin'],
  'oss.sync.create': ['admin', 'channel-admin'],
  'oss.sync.delete': ['admin'],
};

function hasOssPermission(userRoles: string[], permission: string): boolean {
  const allowedRoles = permissionMapping[permission];
  if (!allowedRoles) return false;
  return allowedRoles.some((role: string) => userRoles.includes(role));
}

describe('has-oss-permission 策略测试', () => {
  test('admin 角色通过所有权限检查', () => {
    const allPermissions = Object.keys(permissionMapping);
    allPermissions.forEach(permission => {
      expect(hasOssPermission(['admin'], permission)).toBe(true);
    });
  });

  test('channel-admin 通过文件删除权限', () => {
    expect(hasOssPermission(['channel-admin'], 'oss.file.delete')).toBe(true);
  });

  test('user 角色通过上传权限', () => {
    expect(hasOssPermission(['user'], 'oss.file.upload')).toBe(true);
  });

  test('user 角色被拒绝删除权限', () => {
    expect(hasOssPermission(['user'], 'oss.file.delete')).toBe(false);
  });

  test('instructor 角色被拒绝设置权限', () => {
    expect(hasOssPermission(['instructor'], 'oss.settings.read')).toBe(false);
  });

  test('course-manager 角色通过文件夹创建权限', () => {
    expect(hasOssPermission(['course-manager'], 'oss.folder.create')).toBe(true);
  });

  test('channel-admin 被拒绝 settings 权限', () => {
    expect(hasOssPermission(['channel-admin'], 'oss.settings.read')).toBe(false);
  });

  test('channel-admin 被拒绝 sync.delete 权限', () => {
    expect(hasOssPermission(['channel-admin'], 'oss.sync.delete')).toBe(false);
  });

  test('course-manager 被拒绝 sync 权限', () => {
    expect(hasOssPermission(['course-manager'], 'oss.sync.read')).toBe(false);
  });

  test('不存在的权限键返回 false', () => {
    expect(hasOssPermission(['admin'], 'oss.nonexistent')).toBe(false);
  });

  test('空角色列表返回 false', () => {
    expect(hasOssPermission([], 'oss.file.upload')).toBe(false);
  });

  test('多角色时任一匹配即通过', () => {
    expect(hasOssPermission(['user', 'channel-admin'], 'oss.file.delete')).toBe(true);
  });

  test('user 拥有文件夹读取权限', () => {
    expect(hasOssPermission(['user'], 'oss.folder.read')).toBe(true);
  });

  test('instructor 拥有文件夹读取权限', () => {
    expect(hasOssPermission(['instructor'], 'oss.folder.read')).toBe(true);
  });

  test('course-manager 拥有文件上传权限', () => {
    expect(hasOssPermission(['course-manager'], 'oss.file.upload')).toBe(true);
  });
});
