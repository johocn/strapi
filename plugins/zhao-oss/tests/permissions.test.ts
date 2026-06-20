import PERMISSIONS from '../server/src/permissions';

describe('权限定义测试', () => {
  test('PERMISSIONS 对象应该定义所有必需的权限', () => {
    const requiredPermissions = [
      'oss.file.upload',
      'oss.file.read',
      'oss.file.delete',
      'oss.folder.create',
      'oss.folder.read',
      'oss.settings.read',
      'oss.settings.update',
      'oss.sync.read',
      'oss.sync.create',
      'oss.sync.delete',
    ];

    requiredPermissions.forEach(permission => {
      expect(permission in PERMISSIONS).toBe(true);
      expect(Array.isArray(PERMISSIONS[permission])).toBe(true);
    });
  });

  test('oss.file.upload 应该允许所有注册用户', () => {
    expect(PERMISSIONS['oss.file.upload']).toEqual(['admin', 'channel-admin', 'course-manager', 'instructor', 'user']);
  });

  test('oss.file.read 应该允许所有注册用户', () => {
    expect(PERMISSIONS['oss.file.read']).toEqual(['admin', 'channel-admin', 'course-manager', 'instructor', 'user']);
  });

  test('oss.file.delete 应该仅允许 admin 和 channel-admin', () => {
    expect(PERMISSIONS['oss.file.delete']).toEqual(['admin', 'channel-admin']);
  });

  test('oss.folder.create 应该允许 admin, channel-admin, course-manager', () => {
    expect(PERMISSIONS['oss.folder.create']).toEqual(['admin', 'channel-admin', 'course-manager']);
  });

  test('oss.folder.read 应该允许所有注册用户', () => {
    expect(PERMISSIONS['oss.folder.read']).toEqual(['admin', 'channel-admin', 'course-manager', 'instructor', 'user']);
  });

  test('oss.settings.read 应该仅允许 admin', () => {
    expect(PERMISSIONS['oss.settings.read']).toEqual(['admin']);
  });

  test('oss.settings.update 应该仅允许 admin', () => {
    expect(PERMISSIONS['oss.settings.update']).toEqual(['admin']);
  });

  test('oss.sync.read 应该允许 admin 和 channel-admin', () => {
    expect(PERMISSIONS['oss.sync.read']).toEqual(['admin', 'channel-admin']);
  });

  test('oss.sync.create 应该允许 admin 和 channel-admin', () => {
    expect(PERMISSIONS['oss.sync.create']).toEqual(['admin', 'channel-admin']);
  });

  test('oss.sync.delete 应该仅允许 admin', () => {
    expect(PERMISSIONS['oss.sync.delete']).toEqual(['admin']);
  });
});

describe('权限策略逻辑测试', () => {
  test('admin 角色应该拥有所有权限', () => {
    const adminRole = 'admin';
    const allPermissions = Object.keys(PERMISSIONS);

    allPermissions.forEach(permission => {
      expect(PERMISSIONS[permission].includes(adminRole)).toBe(true);
    });
  });

  test('user 角色应该只拥有上传、读取和文件夹读取权限', () => {
    const userRole = 'user';
    const allowedForUser = ['oss.file.upload', 'oss.file.read', 'oss.folder.read'];
    const allPermissions = Object.keys(PERMISSIONS);

    allPermissions.forEach(permission => {
      if (allowedForUser.includes(permission)) {
        expect(PERMISSIONS[permission].includes(userRole)).toBe(true);
      } else {
        expect(PERMISSIONS[permission].includes(userRole)).toBe(false);
      }
    });
  });

  test('instructor 角色应该拥有上传和读取权限但没有删除和设置权限', () => {
    const instructorRole = 'instructor';
    const allowedForInstructor = ['oss.file.upload', 'oss.file.read', 'oss.folder.read'];
    const deniedForInstructor = ['oss.file.delete', 'oss.folder.create', 'oss.settings.read', 'oss.settings.update', 'oss.sync.read', 'oss.sync.create', 'oss.sync.delete'];

    allowedForInstructor.forEach(permission => {
      expect(PERMISSIONS[permission].includes(instructorRole)).toBe(true);
    });

    deniedForInstructor.forEach(permission => {
      expect(PERMISSIONS[permission].includes(instructorRole)).toBe(false);
    });
  });

  test('course-manager 角色应该拥有文件夹管理权限但没有设置和同步权限', () => {
    const cmRole = 'course-manager';
    const allowedForCM = ['oss.file.upload', 'oss.file.read', 'oss.folder.create', 'oss.folder.read'];
    const deniedForCM = ['oss.settings.read', 'oss.settings.update', 'oss.sync.read', 'oss.sync.create', 'oss.sync.delete'];

    allowedForCM.forEach(permission => {
      expect(PERMISSIONS[permission].includes(cmRole)).toBe(true);
    });

    deniedForCM.forEach(permission => {
      expect(PERMISSIONS[permission].includes(cmRole)).toBe(false);
    });
  });

  test('channel-admin 角色应该拥有除 settings 和 sync.delete 外的所有权限', () => {
    const caRole = 'channel-admin';
    const deniedForCA = ['oss.settings.read', 'oss.settings.update', 'oss.sync.delete'];
    const allPermissions = Object.keys(PERMISSIONS);

    allPermissions.forEach(permission => {
      if (deniedForCA.includes(permission)) {
        expect(PERMISSIONS[permission].includes(caRole)).toBe(false);
      } else {
        expect(PERMISSIONS[permission].includes(caRole)).toBe(true);
      }
    });
  });
});
