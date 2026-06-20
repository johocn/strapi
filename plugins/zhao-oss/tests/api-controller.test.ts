const mockDeleteFileCompletely = jest.fn().mockResolvedValue({ deleted: true });
const mockCheckSyncStatus = jest.fn().mockResolvedValue({ status: 'success' });
const mockGetPrimaryProvider = jest.fn();

const mockStrapi: any = {
  dirs: { static: { public: '/tmp/test-uploads' } },
  db: { query: jest.fn() },
  plugin: jest.fn().mockReturnValue({
    service: jest.fn().mockReturnValue({
      getPrimaryProvider: mockGetPrimaryProvider,
      deleteFileCompletely: mockDeleteFileCompletely,
      checkSyncStatus: mockCheckSyncStatus,
    }),
  }),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
};

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test-file-content')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('d41d8cd98f00b204e9800998ecf8427e'),
    }),
  }),
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/tmp/test-uploads/course/covers/d41d8cd98f00b204e9800998ecf8427e.jpg'),
}));

const fullQueryMock = () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
});

describe('api-controller 测试', () => {
  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const controllerModule = require('../server/src/controllers/api-controller');
    controller = controllerModule.default({ strapi: mockStrapi });
  });

  describe('upload', () => {
    test('无文件时返回 400', async () => {
      const ctx: any = { request: { files: {}, body: {} } };
      await controller.upload(ctx);
      expect(ctx.status).toBe(400);
      expect(ctx.body.error).toBe('No files provided');
    });

    test('OSS 上传成功时返回 OSS URL', async () => {
      const ctx: any = {
        request: {
          files: { file: { path: '/tmp/test.jpg', name: 'test.jpg', type: 'image/jpeg', size: 1024 } },
          body: { folder: '/course/covers' },
        },
      };

      mockGetPrimaryProvider.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          url: 'https://test.oss-cn-beijing.aliyuncs.com/course/covers/test.jpg',
          provider: 'aliyun',
        }),
      });

      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 1, documentId: 'doc123', name: 'test.jpg',
        }),
      });

      await controller.upload(ctx);
      expect(ctx.body.provider_metadata.ossStatus).toBe('success');
      expect(ctx.body.provider_metadata.ossUrl).toBeTruthy();
    });

    test('OSS 上传失败时回退本地', async () => {
      const ctx: any = {
        request: {
          files: { file: { path: '/tmp/test.jpg', name: 'test.jpg', type: 'image/jpeg', size: 1024 } },
          body: { folder: '/course/covers' },
        },
      };

      mockGetPrimaryProvider.mockReturnValue({
        upload: jest.fn().mockRejectedValue(new Error('OSS connection failed')),
      });

      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 2, documentId: 'doc456', name: 'test.jpg',
        }),
      });

      await controller.upload(ctx);
      expect(ctx.body.provider_metadata.ossStatus).toBe('pending');
      expect(ctx.body.provider).toBe('zhao-oss-local');
    });

    test('默认 folderPath 为 /general', async () => {
      const ctx: any = {
        request: {
          files: { file: { path: '/tmp/test.jpg', name: 'test.jpg', type: 'image/jpeg', size: 1024 } },
          body: {},
        },
      };

      mockGetPrimaryProvider.mockReturnValue(null);

      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 3, documentId: 'doc789', name: 'test.jpg',
        }),
      });

      await controller.upload(ctx);
      expect(ctx.body.folderPath).toBe('/general');
    });
  });

  describe('deleteMedia', () => {
    test('缺少 fileId 返回 400', async () => {
      const ctx: any = { params: {}, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(400);
    });

    test('无效 fileId 返回 400', async () => {
      const ctx: any = { params: { fileId: 'abc' }, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(400);
    });

    test('文件不存在返回 404', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue(null),
      });

      const ctx: any = { params: { fileId: '999' }, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(404);
    });

    test('admin 可删除任何文件', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue({ id: 1, createdBy: 99 }),
      });

      const ctx: any = { params: { fileId: '1' }, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.body.success).toBe(true);
    });

    test('非拥有者非管理员返回 403', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue({ id: 1, createdBy: 99 }),
      });

      const ctx: any = { params: { fileId: '1' }, user: { id: 2, roles: ['user'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(403);
    });

    test('拥有者可删除自己的文件', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue({ id: 1, createdBy: 1 }),
      });

      const ctx: any = { params: { fileId: '1' }, user: { id: 1, roles: ['user'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('mediaList', () => {
    test('返回分页结构', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, documentId: 'd1', name: 'test.jpg', url: 'https://oss/test.jpg', hash: 'abc', ext: '.jpg', mime: 'image/jpeg', size: 1024, provider: 'zhao-oss', folderPath: '/general', provider_metadata: {}, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ]),
        count: jest.fn().mockResolvedValue(1),
      });

      const ctx: any = { query: { page: '1', pageSize: '20' } };
      await controller.mediaList(ctx);
      expect(ctx.body.list).toHaveLength(1);
      expect(ctx.body.pagination.total).toBe(1);
    });
  });

  describe('getFolders', () => {
    test('返回扁平文件夹列表', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, documentId: 'f1', name: 'course', path: '/course' },
          { id: 2, documentId: 'f2', name: 'covers', path: '/course/covers' },
        ]),
      });

      const ctx: any = {};
      await controller.getFolders(ctx);
      expect(ctx.body.folders).toBeDefined();
      expect(Array.isArray(ctx.body.folders)).toBe(true);
    });
  });

  describe('createFolder', () => {
    test('缺少 name 返回 400', async () => {
      const ctx: any = { request: { body: {} } };
      await controller.createFolder(ctx);
      expect(ctx.status).toBe(400);
    });

    test('创建顶级文件夹', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ pathId: 1 }]),
        create: jest.fn().mockResolvedValue({ id: 3, documentId: 'f3', name: 'covers', path: '/covers' }),
      });

      const ctx: any = { request: { body: { name: 'covers', parentPath: '/' } } };
      await controller.createFolder(ctx);
      expect(ctx.body.path).toBe('/covers');
    });

    test('重复文件夹返回已有记录', async () => {
      mockStrapi.db.query.mockReturnValue({
        ...fullQueryMock(),
        findOne: jest.fn().mockResolvedValue({ id: 1, documentId: 'f1', name: 'course', path: '/course' }),
      });

      const ctx: any = { request: { body: { name: 'course', parentPath: '/' } } };
      await controller.createFolder(ctx);
      expect(ctx.body.path).toBe('/course');
      expect(ctx.body.id).toBe(1);
    });
  });
});
