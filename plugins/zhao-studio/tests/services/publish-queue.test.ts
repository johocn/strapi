// tests/services/publish-queue.test.ts
// 覆盖 publish-queue.ts 的幂等检查、僵尸 record 清理、幂等 filter 构建

import publishQueueFactory, {
  inferContentTypeFromRecord,
  buildIdempotentFilter,
} from '../../server/src/services/publish-queue';
import { createMockStrapi } from '../helpers/mock-strapi';

// 全局 mock BullMQ Worker（bullmq 未 hoist 到根 node_modules → virtual mock）
jest.mock('bullmq', () => ({
  Worker: jest.fn(),
}), { virtual: true });

// 全局 mock getPublishQueue / registerWorker
let mockQueue: any;
jest.mock('../../server/src/utils/queue', () => ({
  getPublishQueue: () => mockQueue,
  getRedis: () => ({}),
  registerWorker: jest.fn(),
  initStudioQueues: jest.fn(),
}));

// 全局 mock DB lnk fallback helpers
jest.mock('../../server/src/utils/publish-helpers', () => ({
  ...jest.requireActual('../../server/src/utils/publish-helpers'),
  inferContentTypeFromLnk: jest.fn().mockResolvedValue(null),
  resolveContentFromLnk: jest.fn().mockResolvedValue(null),
}));

// =====================================================
// inferContentTypeFromRecord（纯函数）
// =====================================================
describe('inferContentTypeFromRecord', () => {
  test('video 优先于 gallery/article', () => {
    expect(inferContentTypeFromRecord({
      video: { documentId: 'v1' },
      gallery: { documentId: 'g1' },
    })).toBe('video');
    expect(inferContentTypeFromRecord({
      gallery: { documentId: 'g1' },
      article: { documentId: 'a1' },
    })).toBe('gallery');
    expect(inferContentTypeFromRecord({
      article: { documentId: 'a1' },
    })).toBe('article');
  });

  test('relation 是 string（而非对象）也能识别', () => {
    expect(inferContentTypeFromRecord({ video: 'v1' })).toBe('video');
    expect(inferContentTypeFromRecord({ gallery: 'g1' })).toBe('gallery');
    expect(inferContentTypeFromRecord({ article: 'a1' })).toBe('article');
  });

  test('三个 relation 都空 → throw 明确错误', () => {
    expect(() => inferContentTypeFromRecord({})).toThrow('无法推断 contentType');
    expect(() => inferContentTypeFromRecord(null)).toThrow();
  });
});

// =====================================================
// buildIdempotentFilter（纯函数）
// =====================================================
describe('buildIdempotentFilter', () => {
  test('contentType=video → filter.video.documentId=xxx', () => {
    const f = buildIdempotentFilter('video', 'v-doc-id', 'acc-doc-id');
    expect(f.video).toEqual({ documentId: 'v-doc-id' });
    expect(f.account).toEqual({ documentId: 'acc-doc-id' });
    expect(f.status.$in).toEqual(expect.arrayContaining(['queued', 'pending', 'validating']));
  });

  test('contentType=gallery → filter.gallery.documentId=xxx', () => {
    const f = buildIdempotentFilter('gallery', 'g-doc-id', 'acc-doc-id');
    expect(f.gallery).toEqual({ documentId: 'g-doc-id' });
    expect(f.video).toBeUndefined();
  });

  test('contentType=article → filter.article.documentId=xxx', () => {
    const f = buildIdempotentFilter('article', 'a-doc-id', 'acc-doc-id');
    expect(f.article).toEqual({ documentId: 'a-doc-id' });
  });

  test('status $in 包含全部"进行中"状态', () => {
    const f = buildIdempotentFilter('video', 'v', 'a');
    expect(f.status.$in).toEqual(['pending', 'queued', 'validating', 'uploading_media', 'publishing', 'checking_status']);
  });

  test('createdAt $gte = 24h 前的 ISO 时间', () => {
    const before = Date.now();
    const f = buildIdempotentFilter('video', 'v', 'a');
    const after = Date.now();
    const threshold = new Date(f.createdAt.$gte).getTime();
    expect(threshold).toBeGreaterThanOrEqual(before - 24 * 3600_000 - 1000);
    expect(threshold).toBeLessThanOrEqual(after - 24 * 3600_000 + 1000);
  });
});

// =====================================================
// enqueuePublish — 幂等三分支（service 级）
// =====================================================
describe('enqueuePublish 幂等', () => {
  // 通用 setup: mockQueue + mockStrapi，其中 strapi.documents('publish-record')
  // 的 findOne 返回当前 record（供 contentType 推断用），
  // findMany 的返回值由各用例覆盖
  function setup({
    findManyReturn = [],
    findOneRecord = {
      documentId: 'cur-rec',
      id: 1,
      video: { documentId: 'v-doc-1' },
      account: { documentId: 'acc-doc-1' },
    },
  }: { findManyReturn?: any[]; findOneRecord?: any } = {}) {
    mockQueue = { add: jest.fn().mockResolvedValue({ id: 'cur-rec' }) };
    const mockStrapi = createMockStrapi();

    // findOne: publish-record，返回当前 record
    // findMany: 幂等检查结果
    const publishRecordDoc = {
      findOne: jest.fn().mockResolvedValue(findOneRecord),
      findMany: jest.fn().mockResolvedValue(findManyReturn),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ documentId: 'cur-rec' }),
      delete: jest.fn().mockResolvedValue({}),
    };
    mockStrapi.documents = jest.fn((uid: string) => {
      if (uid === 'plugin::zhao-studio.publish-record') return publishRecordDoc;
      return { findMany: jest.fn().mockResolvedValue([]), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    });

    const service = publishQueueFactory({ strapi: mockStrapi });
    return { mockStrapi, publishRecordDoc, service };
  }

  const baseJob: any = {
    publishRecordId: 'cur-rec',
    accountId: 'acc-doc-1',
    contentType: 'video',
  };

  test('幂等检查通过（无其他 in-flight record）→ 正常入队', async () => {
    const { publishRecordDoc, service } = setup({ findManyReturn: [] });

    await service.enqueuePublish(baseJob);

    expect(publishRecordDoc.findMany).toHaveBeenCalled();
    // 验证 filter 带了 $ne 当前 record
    const filter = publishRecordDoc.findMany.mock.calls[0][0].filters;
    expect(filter.$and[1]).toEqual({ documentId: { $ne: 'cur-rec' } });
    // 入队
    expect(mockQueue.add).toHaveBeenCalledWith('publish-job', expect.objectContaining(baseJob), expect.anything());
  });

  test('24h 内同 content+account 有另一个 in-flight record（age=5min）→ throw', async () => {
    const otherRecord = {
      documentId: 'other-rec',
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), // 5min ago
      video: { documentId: 'v-doc-1' },
      account: { documentId: 'acc-doc-1' },
    };
    const { publishRecordDoc, service } = setup({ findManyReturn: [otherRecord] });

    await expect(service.enqueuePublish(baseJob))
      .rejects
      .toThrow(/已在此账号上有进行中的发布任务/);

    // 不入队
    expect(mockQueue.add).not.toHaveBeenCalled();
    // 不更新僵尸（因为 age ≤ 30min）
    expect(publishRecordDoc.update).not.toHaveBeenCalled();
  });

  test('自身刚创建的 queued record（同 documentId）被 $ne 排除 → 放行', async () => {
    // 模拟 Strapi findMany 的真实行为：若 filter.$and[1] 是 $ne 排除自身，就返回空；否则返回自身
    const zombie = {
      documentId: 'cur-rec',
      createdAt: new Date().toISOString(),
    };
    const { publishRecordDoc, service } = setup({});
    publishRecordDoc.findMany.mockImplementation((opts: any) => {
      const neClause = opts?.filters?.$and?.[1];
      if (neClause?.documentId?.$ne === 'cur-rec') return []; // $ne 排除自身 → 空
      return [zombie]; // 没 $ne 就返回自身（会挡死）
    });

    // 有 $ne → 放行
    const jobId = await service.enqueuePublish(baseJob);
    expect(jobId).not.toBeNull();
    expect(mockQueue.add).toHaveBeenCalled();
  });

  test('僵尸 in-flight record 超过 30min → update failed → 放行入队', async () => {
    const zombie = {
      documentId: 'zombie-rec',
      createdAt: new Date(Date.now() - 60 * 60_000).toISOString(), // 60min ago
    };
    const { publishRecordDoc, service } = setup({ findManyReturn: [zombie] });

    await service.enqueuePublish(baseJob);

    // 1. 僵尸被标记 failed
    expect(publishRecordDoc.update).toHaveBeenCalledWith({
      documentId: 'zombie-rec',
      data: { status: 'failed', error: expect.stringContaining('超时自动清理') },
    });
    // 2. 入队放行
    expect(mockQueue.add).toHaveBeenCalled();
  });

  test('僵尸 update 报错不影响放行（catch swallow）', async () => {
    const zombie = {
      documentId: 'zombie-rec',
      createdAt: new Date(Date.now() - 120 * 60_000).toISOString(),
    };
    const { publishRecordDoc, service } = setup({ findManyReturn: [zombie] });
    publishRecordDoc.update.mockRejectedValueOnce(new Error('DB down'));

    // 不 throw，继续入队
    await expect(service.enqueuePublish(baseJob)).resolves.not.toThrow();
    expect(mockQueue.add).toHaveBeenCalled();
  });
});
