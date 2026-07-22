// tests/bootstrap/init-default-roles.test.ts
import { DEFAULT_ROLE_PERMISSIONS } from '../../server/src/permissions';

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

const mockStrapi = {
  db: { query: jest.fn(() => ({ findOne: mockFindOne, update: mockUpdate })) },
  documents: jest.fn(() => ({ create: mockCreate })),
  plugin: jest.fn(() => ({
    service: jest.fn(() => ({
      getMyPermissions: jest.fn().mockResolvedValue([]),
    })),
  })),
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
};

jest.mock('../../server/src/permissions', () => ({
  ...jest.requireActual('../../server/src/permissions'),
  DEFAULT_ROLE_PERMISSIONS: {
    __version: '2026-07-22',
    ADMIN: ['admin.perm'],
    CHANNEL_ADMIN: ['channel.perm'],
  },
  ROLES: { ADMIN: 'ADMIN', CHANNEL_ADMIN: 'CHANNEL_ADMIN' },
  ROLE_LABELS: { ADMIN: '管理员', CHANNEL_ADMIN: '渠道管理员' },
}));

describe('initDefaultRoles with seedVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates role when not exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const { initDefaultRoles } = require('../../server/src/services/permission.service');
    const results = await initDefaultRoles(mockStrapi);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'ADMIN',
          permissions: ['admin.perm'],
          seedVersion: '2026-07-22',
        }),
      })
    );
  });

  it('skips system role when seedVersion matches', async () => {
    mockFindOne.mockResolvedValue({
      id: 1,
      role: 'ADMIN',
      permissions: ['custom.perm'],
      isSystem: true,
      seedVersion: '2026-07-22',
    });

    const { initDefaultRoles } = require('../../server/src/services/permission.service');
    await initDefaultRoles(mockStrapi);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('overwrites system role when seedVersion differs', async () => {
    mockFindOne.mockResolvedValue({
      id: 1,
      role: 'ADMIN',
      permissions: ['old.perm'],
      isSystem: true,
      seedVersion: '2026-06-01',
    });

    const { initDefaultRoles } = require('../../server/src/services/permission.service');
    await initDefaultRoles(mockStrapi);

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('does not overwrite non-system role', async () => {
    mockFindOne.mockResolvedValue({
      id: 2,
      role: 'custom-role',
      permissions: ['custom.perm'],
      isSystem: false,
      seedVersion: '',
    });

    const { initDefaultRoles } = require('../../server/src/services/permission.service');
    await initDefaultRoles(mockStrapi);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
