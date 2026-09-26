const mockUploadFile = jest.fn();
const mockListFiles = jest.fn();
const mockGetFolderTree = jest.fn();
const mockCreateFolder = jest.fn();
const mockFindFileById = jest.fn();
const mockCanDeleteFile = jest.fn();
const mockDeleteFileCompletely = jest.fn();
const mockCheckSyncStatus = jest.fn();

const mediaServiceMock = {
  uploadFile: mockUploadFile,
  listFiles: mockListFiles,
  getFolderTree: mockGetFolderTree,
  createFolder: mockCreateFolder,
  findFileById: mockFindFileById,
  canDeleteFile: mockCanDeleteFile,
};

const syncServiceMock = {
  deleteFileCompletely: mockDeleteFileCompletely,
  checkSyncStatus: mockCheckSyncStatus,
};

const mockGetPrimaryProvider = jest.fn();
const mockGetObjectStream = jest.fn();

const registryServiceMock = {
  getPrimaryProvider: mockGetPrimaryProvider,
};

const mockStrapi: any = {
  plugin: jest.fn().mockReturnValue({
    service: jest.fn((name: string) => {
      if (name === "media-service") return mediaServiceMock;
      if (name === "provider-registry") return registryServiceMock;
      return syncServiceMock;
    }),
  }),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
};

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('test-file-content')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

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
      expect(ctx.body).toEqual({ error: 'No files provided' });
    });

    test('读取文件并调用 mediaService.uploadFile，返回包装结果', async () => {
      const result = {
        id: 1,
        documentId: 'doc123',
        name: 'test.jpg',
        url: 'https://oss/test.jpg',
        provider: 'aliyun',
        folderPath: '/course/covers',
      };
      mockUploadFile.mockResolvedValue(result);

      const ctx: any = {
        request: {
          files: {
            file: {
              filepath: '/tmp/test.jpg',
              originalFilename: 'test.jpg',
              mimetype: 'image/jpeg',
              size: 1024,
            },
          },
          body: { data: { name: 'renamed.jpg', folder: '/course/covers', folderId: '7' } },
        },
      };

      await controller.upload(ctx);

      expect(ctx.body).toEqual({ data: result, meta: {} });
      expect(mockUploadFile).toHaveBeenCalledWith({
        fileBuffer: expect.any(Buffer),
        originalName: 'test.jpg',
        customName: 'renamed.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        folderInput: '/course/covers',
        folderIdInput: '7',
      });
    });

    test('folder 缺省为 /general，name 缺省为 null', async () => {
      mockUploadFile.mockResolvedValue({ id: 2 });

      const ctx: any = {
        request: {
          files: { file: { path: '/tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg', size: 10 } },
          body: {},
        },
      };

      await controller.upload(ctx);

      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'a.jpg',
          customName: null,
          mimeType: 'image/jpeg',
          folderInput: '/general',
          folderIdInput: undefined,
        })
      );
    });

    test('uploadFile 抛错时透传 status 与错误信息', async () => {
      mockUploadFile.mockRejectedValue(Object.assign(new Error('too large'), { status: 413 }));

      const ctx: any = {
        request: {
          files: { file: { path: '/tmp/a.jpg', name: 'a.jpg', type: 'image/jpeg', size: 10 } },
          body: {},
        },
      };

      await controller.upload(ctx);

      expect(ctx.status).toBe(413);
      expect(ctx.body).toEqual({ error: 'too large' });
    });
  });

  describe('deleteMedia', () => {
    test('缺少 fileId 返回 400', async () => {
      const ctx: any = { params: {}, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({ error: 'fileId is required' });
    });

    test('无效 fileId 返回 400', async () => {
      const ctx: any = { params: { fileId: 'abc' }, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({ error: 'Invalid fileId' });
    });

    test('文件不存在返回 404', async () => {
      mockFindFileById.mockResolvedValue(null);

      const ctx: any = { params: { fileId: '999' }, user: { id: 1, roles: ['admin'] } };
      await controller.deleteMedia(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body).toEqual({ error: 'File not found' });
      expect(mockFindFileById).toHaveBeenCalledWith(999);
    });

    test('无删除权限返回 403，并把 ctx.user 传给 canDeleteFile', async () => {
      const user = { id: 2, roles: ['user'] };
      mockFindFileById.mockResolvedValue({ id: 1, createdBy: 99 });
      mockCanDeleteFile.mockResolvedValue(false);

      const ctx: any = { params: { fileId: '1' }, user };
      await controller.deleteMedia(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body).toEqual({ error: '无权删除此媒体文件' });
      expect(mockCanDeleteFile).toHaveBeenCalledWith(1, user);
      expect(mockDeleteFileCompletely).not.toHaveBeenCalled();
    });

    test('有权限时删除并返回成功包装结果', async () => {
      const user = { id: 1, roles: ['admin'] };
      mockFindFileById.mockResolvedValue({ id: 1, createdBy: 1 });
      mockCanDeleteFile.mockResolvedValue(true);
      mockDeleteFileCompletely.mockResolvedValue({ deleted: true });

      const ctx: any = { params: { fileId: '1' }, user };
      await controller.deleteMedia(ctx);

      expect(mockDeleteFileCompletely).toHaveBeenCalledWith(1);
      expect(ctx.body).toEqual({
        data: { success: true, fileId: 1, details: { deleted: true } },
        meta: {},
      });
    });

    test('优先使用 ctx.state.user', async () => {
      const stateUser = { id: 5, roles: ['channel-admin'] };
      mockFindFileById.mockResolvedValue({ id: 1, createdBy: 99 });
      mockCanDeleteFile.mockResolvedValue(true);
      mockDeleteFileCompletely.mockResolvedValue({});

      const ctx: any = {
        params: { fileId: '1' },
        user: { id: 2 },
        state: { user: stateUser },
      };
      await controller.deleteMedia(ctx);

      expect(mockCanDeleteFile).toHaveBeenCalledWith(1, stateUser);
    });
  });

  describe('mediaList', () => {
    test('把 {list,pagination} 归一为 {data, meta.pagination} 并透传 query', async () => {
      const list = [{ id: 1, name: 'test.jpg' }];
      const pagination = { page: 1, pageSize: 20, total: 1, pageCount: 1 };
      mockListFiles.mockResolvedValue({ list, pagination });

      const user = { id: 1, roles: ['admin'] };
      const ctx: any = { query: { page: '1', pageSize: '20' }, state: { user } };
      await controller.mediaList(ctx);

      expect(ctx.body).toEqual({ data: list, meta: { pagination } });
      expect(mockListFiles).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        folderPath: undefined,
        mime: undefined,
        search: undefined,
        sort: 'createdAt:desc',
        user,
      });
    });

    test('把 {results,pagination} 归一为 {data, meta.pagination}', async () => {
      const results = [{ id: 2 }];
      const pagination = { page: 2, pageSize: 10, total: 11, pageCount: 2 };
      mockListFiles.mockResolvedValue({ results, pagination });

      const ctx: any = {
        query: {
          page: '2',
          pageSize: '10',
          folderPath: '/course',
          mime: 'image',
          search: 'a',
          sort: 'name:asc',
        },
      };
      await controller.mediaList(ctx);

      expect(ctx.body).toEqual({ data: results, meta: { pagination } });
      expect(mockListFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 10,
          folderPath: '/course',
          mime: 'image',
          search: 'a',
          sort: 'name:asc',
        })
      );
    });
  });

  describe('getFolders', () => {
    test('返回包装后的文件夹列表', async () => {
      const folders = [{ id: 1, documentId: 'f1', name: 'course', path: '/1', children: [] }];
      mockGetFolderTree.mockResolvedValue(folders);

      const ctx: any = {};
      await controller.getFolders(ctx);

      expect(ctx.body).toEqual({ data: { folders }, meta: {} });
    });
  });

  describe('createFolder', () => {
    test('缺少 name 返回 400', async () => {
      const ctx: any = { request: { body: {} } };
      await controller.createFolder(ctx);
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({ error: 'Folder name is required' });
    });

    test('创建顶级文件夹，parentId 缺省为 null', async () => {
      const created = { id: 3, documentId: 'f3', name: 'covers', path: '/3' };
      mockCreateFolder.mockResolvedValue(created);

      const ctx: any = { request: { body: { data: { name: 'covers' } } } };
      await controller.createFolder(ctx);

      expect(mockCreateFolder).toHaveBeenCalledWith('covers', null);
      expect(ctx.body).toEqual({ data: created, meta: {} });
    });

    test('传入 parentId 时透传给 createFolder', async () => {
      mockCreateFolder.mockResolvedValue({ id: 4, name: 'covers', path: '/1/4' });

      const ctx: any = { request: { body: { name: 'covers', parentId: 1 } } };
      await controller.createFolder(ctx);

      expect(mockCreateFolder).toHaveBeenCalledWith('covers', 1);
    });

    test('重复文件夹返回已有记录', async () => {
      const existing = { id: 1, documentId: 'f1', name: 'course', path: '/1' };
      mockCreateFolder.mockResolvedValue(existing);

      const ctx: any = { request: { body: { name: 'course' } } };
      await controller.createFolder(ctx);

      expect(ctx.body).toEqual({ data: existing, meta: {} });
    });
  });

  describe('shareMedia', () => {
    const makeCtx = (key: string) => {
      const headers: Record<string, string> = {};
      return {
        headers,
        ctx: {
          params: { key },
          set: (k: string, v: string) => {
            headers[k] = v;
          },
        } as any,
      };
    };

    test('空路径返回 400，且不访问 OSS', async () => {
      const { ctx } = makeCtx('');

      await controller.shareMedia(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({ error: '非法的分享图路径' });
      expect(mockGetPrimaryProvider).not.toHaveBeenCalled();
    });

    test('含 .. 段的路径返回 400', async () => {
      const { ctx } = makeCtx('../uploads/a.jpg');
      await controller.shareMedia(ctx);
      expect(ctx.status).toBe(400);
      expect(mockGetPrimaryProvider).not.toHaveBeenCalled();
    });

    test('provider 未就绪返回 503', async () => {
      mockGetPrimaryProvider.mockReturnValue(undefined);
      const { ctx } = makeCtx('poster/a.png');

      await controller.shareMedia(ctx);

      expect(ctx.status).toBe(503);
    });

    test('流式返回 share/ 前缀下的对象并设置长缓存头', async () => {
      const stream = { pipe: jest.fn() };
      mockGetPrimaryProvider.mockReturnValue({ getObjectStream: mockGetObjectStream });
      mockGetObjectStream.mockResolvedValue({
        stream,
        headers: { 'content-type': 'image/jpeg', 'content-length': '1234' },
        size: 1234,
      });

      const { ctx, headers } = makeCtx('/poster/a.jpg');
      await controller.shareMedia(ctx);

      expect(mockGetObjectStream).toHaveBeenCalledWith('share/poster/a.jpg');
      expect(ctx.status).toBe(200);
      expect(ctx.body).toBe(stream);
      expect(headers['Content-Type']).toBe('image/jpeg');
      expect(headers['Cache-Control']).toBe('public, max-age=86400');
      expect(headers['Content-Length']).toBe('1234');
    });

    test('云端缺 content-length 时用 res.size 兜底', async () => {
      mockGetPrimaryProvider.mockReturnValue({ getObjectStream: mockGetObjectStream });
      mockGetObjectStream.mockResolvedValue({ stream: {}, headers: {}, size: 88 });

      const { ctx, headers } = makeCtx('a.png');
      await controller.shareMedia(ctx);

      expect(headers['Content-Type']).toBe('application/octet-stream');
      expect(headers['Content-Length']).toBe('88');
    });

    test('对象不存在返回 404，其它错误返回 502', async () => {
      mockGetPrimaryProvider.mockReturnValue({ getObjectStream: mockGetObjectStream });

      mockGetObjectStream.mockRejectedValueOnce(
        Object.assign(new Error('NoSuchKey'), { status: 404 })
      );
      const notFound = makeCtx('missing.png');
      await controller.shareMedia(notFound.ctx);
      expect(notFound.ctx.status).toBe(404);

      mockGetObjectStream.mockRejectedValueOnce(new Error('network error'));
      const failed = makeCtx('a.png');
      await controller.shareMedia(failed.ctx);
      expect(failed.ctx.status).toBe(502);
    });
  });
});