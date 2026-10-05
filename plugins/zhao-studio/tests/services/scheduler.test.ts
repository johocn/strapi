// tests/services/scheduler.test.ts
// scheduler.scanAndTriggerSchedules + registerSchedulers + refreshExpiringTokens 单测

// 这些 mock 在 Jest 加载时就生效（hoisted 到文件顶部之前）
jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({ close: jest.fn() })),
}));

jest.mock('../../server/src/utils/publish-helpers', () => ({
  detectContentType: jest.fn(),
  inferContentTypeFromScheduleLnk: jest.fn(),
  CONTENT_UID: {
    article: 'plugin::zhao-studio.article-draft',
    video: 'plugin::zhao-studio.publish-video',
    gallery: 'plugin::zhao-studio.publish-gallery',
  },
  createPublishRecord: jest.fn(),
}));

// queue.ts 单例 mock — 跨测试复用同一对象，每次 beforeEach 清方法状态
const mockSchedulerQueue = {
  getRepeatableJobs: jest.fn(),
  removeRepeatableByKey: jest.fn(),
  add: jest.fn(),
};
jest.mock('../../server/src/utils/queue', () => ({
  getSchedulerQueue: () => mockSchedulerQueue,
  getRedis: () => ({ /* fake redis */ }),
  registerWorker: jest.fn(),
  getPublishQueue: () => null,
  initStudioQueues: jest.fn(),
}));

const { Worker } = require('bullmq');
const {
  detectContentType,
  inferContentTypeFromScheduleLnk,
  CONTENT_UID,
  createPublishRecord,
} = require('../../server/src/utils/publish-helpers');
const { registerWorker } = require('../../server/src/utils/queue');

// 只 import 一次 —— 后面用 fresh scheduler 函数但共享模块状态
const schedulerFactory = require('../../server/src/services/scheduler').default;

// 辅助：构造 strapi mock
function makeStrapiMock(options: {
  pendingSchedules?: any[];
  expiredSchedules?: any[];
  contentById?: Record<string, any>;
  accountMap?: Record<string, any>;
  findOneContentReturnsNullForDocIds?: string[];
  expiringAccounts?: any[];
} = {}) {
  const {
    pendingSchedules = [],
    expiredSchedules = [],
    contentById = {},
    accountMap = {},
    findOneContentReturnsNullForDocIds = [],
    expiringAccounts = [],
  } = options;

  const records: any[] = [];
  const updates: any[] = [];

  const allAccounts = { ...accountMap };
  for (const a of expiringAccounts) {
    allAccounts[a.documentId] = a;
  }

  const documentsMock = jest.fn().mockImplementation((uid: string) => {
    return {
      findMany: jest.fn().mockImplementation(({ filters }: any) => {
        if (uid === 'plugin::zhao-studio.publish-schedule') {
          if (filters?.scheduledAt?.$lt) {
            return Promise.resolve(expiredSchedules);
          }
          return Promise.resolve(pendingSchedules);
        }
        if (uid === 'plugin::zhao-studio.publish-account') {
          const ids: string[] = filters?.documentId?.$in || [];
          if (ids.length > 0) {
            return Promise.resolve(ids.map((id) => allAccounts[id]).filter(Boolean));
          }
          if (filters?.oauthState || filters?.oauthExpiresAt) {
            return Promise.resolve(
              Object.values(allAccounts).filter((a: any) => a.oauthState === 'authorized'),
            );
          }
          return Promise.resolve(Object.values(allAccounts));
        }
        return Promise.resolve([]);
      }),

      findOne: jest.fn().mockImplementation(({ documentId }: any) => {
        if (findOneContentReturnsNullForDocIds.includes(documentId)) return Promise.resolve(null);
        const key = Object.keys(contentById).find((k) => k === documentId);
        if (key) return Promise.resolve(contentById[key]);
        return Promise.resolve(null);
      }),

      create: jest.fn().mockImplementation(({ data }: any) => {
        const id = records.length + 1;
        const doc = { id, documentId: `rec_${id}`, ...data };
        records.push(doc);
        return Promise.resolve(doc);
      }),

      update: jest.fn().mockImplementation(({ documentId, data }: any) => {
        updates.push({ uid, documentId, data });
        return Promise.resolve({ documentId, ...data });
      }),
    };
  });

  const db = {
    connection: {
      query: jest.fn().mockResolvedValue([]),
    },
  };

  const queueSvc = {
    enqueuePublish: jest.fn().mockResolvedValue('job_id'),
  };

  const oauthSvc = {
    ensureValidToken: jest.fn().mockResolvedValue({ accessToken: 'xxx' }),
  };

  const plugin = jest.fn().mockReturnValue({
    service: jest.fn().mockImplementation((name: string) => {
      if (name === 'publish-queue') return queueSvc;
      if (name === 'oauth-manager') return oauthSvc;
      return null;
    }),
  });

  const log = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  return {
    strapi: { documents: documentsMock, db, plugin, log },
    queueSvc,
    oauthSvc,
    getRecords: () => records,
    getUpdates: () => updates,
  };
}

// 每个测试后清理 scheduler 内部 worker/scanJobRegistered 状态
async function cleanupSchedulerWorker(svc: any) {
  try { await svc.closeWorker(); } catch { /* ignore */ }
}

beforeEach(() => {
  jest.clearAllMocks();
  // 重置 queue singleton 方法的返回值（clearAllMocks 会清调用记录，但 mockReturnValue 还在）
  mockSchedulerQueue.getRepeatableJobs.mockResolvedValue([]);
  mockSchedulerQueue.removeRepeatableByKey.mockResolvedValue(undefined);
  mockSchedulerQueue.add.mockResolvedValue({ id: 'new_job' });
});

afterEach(async () => {
  // 确保没有遗留 worker 实例
  Worker.mockClear();
});

// ─── scanAndTriggerSchedules ───

describe('scheduler.scanAndTriggerSchedules', () => {
  let svc: any;

  afterEach(async () => { await cleanupSchedulerWorker(svc); });

  it('pending schedule → 为每个 account 创建 record + enqueue → schedule 置 triggered', async () => {
    const scheduleDoc = {
      id: 100, documentId: 'sch_abc', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: { documentId: 'vid_1', id: 1 },
      accountIds: ['acc_1', 'acc_2'],
    };
    const acc1 = { documentId: 'acc_1', id: 1, name: 'WX' };
    const acc2 = { documentId: 'acc_2', id: 2, name: 'BL' };

    detectContentType.mockReturnValue('video');
    createPublishRecord.mockImplementation(async (_s, _ct, _cd, _cid, accDocId) => ({
      documentId: `rec_${accDocId}`,
    }));

    const ctx = makeStrapiMock({
      pendingSchedules: [scheduleDoc],
      contentById: { vid_1: { documentId: 'vid_1', id: 1, status: 'ready' } },
      accountMap: { acc_1: acc1, acc_2: acc2 },
    });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledTimes(2);
    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'video', accountId: 'acc_1', triggerSource: 'schedule' }),
    );
    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'video', accountId: 'acc_2', triggerSource: 'schedule' }),
    );
    const updates = ctx.getUpdates().filter((u: any) => u.documentId === 'sch_abc');
    expect(updates.some((u: any) => u.data.status === 'triggered')).toBe(true);
  });

  it('populate 全空 → detectContentType=null → inferContentTypeFromScheduleLnk fallback 拿 contentType + DB lnk join 拿 contentDocumentId', async () => {
    const scheduleDoc = {
      id: 200, documentId: 'sch_popnull', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: null, gallery: null, article: null,
      accountIds: ['acc_1'],
    };

    detectContentType.mockReturnValue(null);
    inferContentTypeFromScheduleLnk.mockResolvedValue('article');
    createPublishRecord.mockResolvedValue({ documentId: 'rec_ok' });

    const ctx = makeStrapiMock({
      pendingSchedules: [scheduleDoc],
      accountMap: { acc_1: { documentId: 'acc_1', id: 1 } },
      // 关键：lnk join 返回 art_1 后，scheduler findOne 要能命中
      contentById: { art_1: { documentId: 'art_1', id: 10, status: 'ready' } },
    });
    // DB lnk JOIN 返回 contentDocumentId（scheduler.ts line 93）
    ctx.strapi.db.connection.query.mockResolvedValue([{ document_id: 'art_1' }]);

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    // lnk fallback 被调了
    expect(inferContentTypeFromScheduleLnk).toHaveBeenCalled();
    // DB lnk join 被调用（scheduler line 93 或 helpers 内部的）
    expect(ctx.strapi.db.connection.query).toHaveBeenCalled();
    // enqueue 成功
    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledTimes(1);
    // 没报 error
    expect(ctx.strapi.log.error).not.toHaveBeenCalledWith(expect.stringContaining('sch_popnull'));
  });

  it('accountIds 里某个 account 不存在 → warn 跳过，不崩', async () => {
    const scheduleDoc = {
      id: 300, documentId: 'sch_missacc', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: { documentId: 'vid_1', id: 1 },
      accountIds: ['acc_1', 'acc_missing'],
    };
    detectContentType.mockReturnValue('video');
    createPublishRecord.mockResolvedValue({ documentId: 'rec_ok' });

    const ctx = makeStrapiMock({
      pendingSchedules: [scheduleDoc],
      contentById: { vid_1: { documentId: 'vid_1', id: 1 } },
      accountMap: { acc_1: { documentId: 'acc_1', id: 1 } }, // acc_missing 不在 map 里
    });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledTimes(1); // 只有 acc_1
    expect(ctx.strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('account acc_missing 不存在'));
  });

  it('enqueuePublish 抛错 → warn + 继续下一个 account', async () => {
    const scheduleDoc = {
      id: 400, documentId: 'sch_enqfail', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: { documentId: 'vid_1', id: 1 },
      accountIds: ['acc_1', 'acc_2'],
    };
    detectContentType.mockReturnValue('video');
    createPublishRecord.mockImplementation(async (_s, _ct, _cd, _cid, aId) => ({
      documentId: `rec_${aId}`,
    }));

    const ctx = makeStrapiMock({
      pendingSchedules: [scheduleDoc],
      contentById: { vid_1: { documentId: 'vid_1', id: 1 } },
      accountMap: {
        acc_1: { documentId: 'acc_1', id: 1 },
        acc_2: { documentId: 'acc_2', id: 2 },
      },
    });
    ctx.queueSvc.enqueuePublish
      .mockResolvedValueOnce('job_1')
      .mockRejectedValueOnce(new Error('Redis connection lost'));

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    // warn 过
    expect(ctx.strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('enqueue failed'));
    // 成功的那条 schedule 仍被置 triggered
    const updates = ctx.getUpdates().filter((u: any) => u.documentId === 'sch_enqfail');
    expect(updates.some((u: any) => u.data.status === 'triggered')).toBe(true);
  });

  it('schedule1 contentType 推断失败 → error 跳过，不阻塞 schedule2', async () => {
    const s1 = {
      id: 500, documentId: 'sch_fail1', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: null, gallery: null, article: null,
      accountIds: ['acc_1'],
    };
    const s2 = {
      id: 501, documentId: 'sch_ok2', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000),
      video: { documentId: 'vid_1', id: 1 },
      accountIds: ['acc_1'],
    };
    detectContentType.mockReturnValueOnce(null).mockReturnValueOnce('video');
    inferContentTypeFromScheduleLnk.mockResolvedValue(null);
    createPublishRecord.mockResolvedValue({ documentId: 'rec_s2' });

    const ctx = makeStrapiMock({
      pendingSchedules: [s1, s2],
      contentById: { vid_1: { documentId: 'vid_1', id: 1 } },
      accountMap: { acc_1: { documentId: 'acc_1', id: 1 } },
    });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    // s1 error 跳过
    expect(ctx.strapi.log.error).toHaveBeenCalledWith(expect.stringContaining('sch_fail1'));
    // s2 正常 enqueue
    expect(ctx.queueSvc.enqueuePublish).toHaveBeenCalledTimes(1);
  });
});

// ─── 过期 schedule 清理 ───

describe('scheduler: 过期 schedule 清理', () => {
  let svc: any;
  afterEach(async () => { await cleanupSchedulerWorker(svc); });

  it('25h 前 scheduledAt → 标记 expired', async () => {
    const oldSchedule = {
      id: 600, documentId: 'sch_old', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    };
    const ctx = makeStrapiMock({
      pendingSchedules: [],
      expiredSchedules: [oldSchedule],
    });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    const updates = ctx.getUpdates().filter((u: any) => u.documentId === 'sch_old');
    expect(updates.some((u: any) => u.data.status === 'expired')).toBe(true);
  });

  it('23h 前 → 不标记 expired', async () => {
    const recentSchedule = {
      id: 601, documentId: 'sch_recent', status: 'scheduled',
      scheduledAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    };
    const ctx = makeStrapiMock({
      pendingSchedules: [recentSchedule],
      expiredSchedules: [],
    });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.scanAndTriggerSchedules();

    const updates = ctx.getUpdates().filter((u: any) => u.documentId === 'sch_recent');
    expect(updates.some((u: any) => u.data.status === 'expired')).toBe(false);
  });
});

// ─── registerSchedulers ───

describe('scheduler.registerSchedulers', () => {
  let svc: any;
  afterEach(async () => { await cleanupSchedulerWorker(svc); });

  it('清理旧 repeatable + 注册新 cron + 启动 BullMQ Worker', async () => {
    // 预置旧的 repeatable jobs
    mockSchedulerQueue.getRepeatableJobs.mockResolvedValue([
      { id: 'scan-and-trigger', key: 'key_xxx' },
      { id: 'other', key: 'key_other' },
    ]);

    const strapiMock = {
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      plugin: () => ({ service: () => null }),
    };

    svc = schedulerFactory({ strapi: strapiMock });
    await svc.registerSchedulers();

    // 只清 id=scan-and-trigger 的那个
    expect(mockSchedulerQueue.removeRepeatableByKey).toHaveBeenCalledWith('key_xxx');
    expect(mockSchedulerQueue.removeRepeatableByKey).not.toHaveBeenCalledWith('key_other');

    // cron 注册
    expect(mockSchedulerQueue.add).toHaveBeenCalledWith(
      'scan-and-trigger',
      { type: 'scan' },
      expect.objectContaining({
        jobId: 'scan-and-trigger',
        repeat: expect.objectContaining({ cron: '* * * * *' }),
      }),
    );

    // BullMQ Worker 被 new 了
    expect(Worker).toHaveBeenCalled();
    expect(Worker).toHaveBeenCalledWith(
      'studio-scheduler',
      expect.any(Function),
      expect.objectContaining({ concurrency: 1 }),
    );

    // registerWorker 被调
    expect(registerWorker).toHaveBeenCalled();
    expect(strapiMock.log.info).toHaveBeenCalledWith(
      expect.stringContaining('scheduler worker registered'),
    );
  });
});

// ─── refreshExpiringTokens ───

describe('scheduler.refreshExpiringTokens', () => {
  let svc: any;
  afterEach(async () => { await cleanupSchedulerWorker(svc); });

  it('快过期 authorized token → refresh 成功 → oauthState 保持', async () => {
    const soonExpiring = {
      id: 1, documentId: 'acc_soon', name: 'WX',
      oauthExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      oauthState: 'authorized',
    };
    const ctx = makeStrapiMock({ expiringAccounts: [soonExpiring] });

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.refreshExpiringTokens();

    expect(ctx.oauthSvc.ensureValidToken).toHaveBeenCalledWith('acc_soon');
    const updates = ctx.getUpdates();
    expect(updates.filter((u: any) => u.data.oauthState === 'expired').length).toBe(0);
  });

  it('refresh 抛错 → 标记 oauthState=expired', async () => {
    const failing = {
      id: 2, documentId: 'acc_fail', name: 'WX',
      oauthExpiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      oauthState: 'authorized',
    };
    const ctx = makeStrapiMock({ expiringAccounts: [failing] });
    ctx.oauthSvc.ensureValidToken.mockRejectedValue(new Error('refresh token revoked'));

    svc = schedulerFactory({ strapi: ctx.strapi });
    await svc.refreshExpiringTokens();

    expect(ctx.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('auto refresh token failed'),
    );
    const updates = ctx.getUpdates();
    expect(updates.some(
      (u: any) => u.documentId === 'acc_fail' && u.data.oauthState === 'expired',
    )).toBe(true);
  });
});
