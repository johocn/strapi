import {
  detectStatusChange,
  audienceFor,
  TERMINAL_STATUSES,
} from '../server/src/services/activity-notice';
import activityServiceFactory from '../server/src/services/activity';

const base = {
  id: 7,
  documentId: 'act7',
  title: '线下活动',
  status: 'signup_open',
  startTime: '2026-10-01T02:00:00.000Z',
  endTime: '2026-10-01T04:00:00.000Z',
  publishedAt: '2026-09-20T00:00:00.000Z',
};

describe('detectStatusChange（改期/取消判定，status 真实枚举为 draft/signup_open/ongoing/ended/archived，无 cancelled）', () => {
  test('startTime 变化 → rescheduled', () => {
    const r = detectStatusChange(base, { ...base, startTime: '2026-10-02T02:00:00.000Z' });
    expect(r).toEqual({ kind: 'rescheduled', changedFields: ['startTime'] });
  });

  test('endTime 变化 → rescheduled', () => {
    const r = detectStatusChange(base, { ...base, endTime: '2026-10-01T05:00:00.000Z' });
    expect(r).toEqual({ kind: 'rescheduled', changedFields: ['endTime'] });
  });

  test('同一时刻不同时区字面量视为未变化 → none', () => {
    const r = detectStatusChange(base, { ...base, startTime: '2026-10-01T10:00:00+08:00' });
    expect(r).toEqual({ kind: 'none', changedFields: [] });
  });

  test('status 流转为终态 ended → cancelled（枚举无 cancelled，以终态为准）', () => {
    const r = detectStatusChange(base, { ...base, status: 'ended' });
    expect(r).toEqual({ kind: 'cancelled', changedFields: ['status'] });
  });

  test('status 流转为 archived → cancelled', () => {
    const r = detectStatusChange(base, { ...base, status: 'archived' });
    expect(r).toEqual({ kind: 'cancelled', changedFields: ['status'] });
  });

  test('publishedAt 有→无（下架）→ cancelled，即使 status 未变', () => {
    const r = detectStatusChange(base, { ...base, publishedAt: null });
    expect(r).toEqual({ kind: 'cancelled', changedFields: ['publishedAt'] });
  });

  test('时间与状态同时变化 → 取消优先于改期，changedFields 两者都记', () => {
    const r = detectStatusChange(base, {
      ...base,
      startTime: '2026-10-02T02:00:00.000Z',
      endTime: '2026-10-02T04:00:00.000Z',
      status: 'ended',
    });
    expect(r.kind).toBe('cancelled');
    expect(r.changedFields).toEqual(expect.arrayContaining(['startTime', 'endTime', 'status']));
  });

  test('非终态状态流转（draft→signup_open）不触发任何通知 → none', () => {
    const old = { ...base, status: 'draft', publishedAt: null };
    const r = detectStatusChange(old, { ...base });
    expect(r).toEqual({ kind: 'none', changedFields: [] });
  });

  test('完全无变化 → none', () => {
    expect(detectStatusChange(base, { ...base })).toEqual({ kind: 'none', changedFields: [] });
  });

  test('新活动（无旧值）→ none', () => {
    expect(detectStatusChange(null, base)).toEqual({ kind: 'none', changedFields: [] });
    expect(detectStatusChange(undefined, base).kind).toBe('none');
  });

  test('终态枚举集合为 ended/archived', () => {
    expect(TERMINAL_STATUSES).toEqual(['ended', 'archived']);
  });
});

describe('audienceFor（收件人 = 该活动 active+waiting 报名用户去重集合）', () => {
  test('过滤 cancelled 用户并按 user.id 去重', () => {
    const rows = [
      { status: 'active', user: { id: 1 } },
      { status: 'waiting', user: { id: 2 } },
      { status: 'cancelled', user: { id: 3 } },
      { status: 'active', user: { id: 1 } },
    ];
    expect(audienceFor(rows)).toEqual([1, 2]);
  });

  test('兼容 user 裸 id 形态，过滤非法 id 与缺失 user', () => {
    const rows = [
      { status: 'active', user: 5 },
      { status: 'waiting', user: { id: NaN } },
      { status: 'active', user: null },
      { status: 'active' },
      { status: 'waiting', user: { id: 6 } },
    ];
    expect(audienceFor(rows)).toEqual([5, 6]);
  });

  test('空名单/非法入参 → 空数组', () => {
    expect(audienceFor([])).toEqual([]);
    expect(audienceFor(null as any)).toEqual([]);
  });
});

/**
 * notifyPromoted 通道隔离：微信失败不得连坐站内信。
 * 根因（Task1.1 读码结论）：sso-msg.sendNow → buildJob 对缺失模板抛 SSO_MSG_TEMPLATE_404，
 * sendJob 对空 wx_template_id 抛 SSO_MSG_JOB_500("任务缺少模板ID")，两者都会逃逸出 sendNow。
 */
describe('notifyPromoted（递补转正：站内信与微信通道隔离）', () => {
  const ACT_UID = 'plugin::zhao-point.activity';
  const ACT = { id: 10, title: '线下活动', startTime: '2026-10-01T02:00:00.000Z' };

  const buildStrapi = (opts: { resolveSso?: any; sendNow?: jest.Mock; sendInApp?: jest.Mock } = {}) => {
    const warn = jest.fn();
    const msg = {
      sendNow: opts.sendNow ?? jest.fn().mockResolvedValue({ status: 'sent' }),
      sendInApp: opts.sendInApp ?? jest.fn().mockResolvedValue({ job: { id: 1 } }),
    };
    const sop = {
      resolveSsoUserForUpUser: jest.fn().mockResolvedValue(opts.resolveSso === undefined ? { id: 5 } : opts.resolveSso),
    };
    const strapi: any = {
      log: { warn, info: jest.fn() },
      db: {
        query: (uid: string) => ({
          findOne: jest.fn().mockResolvedValue(uid === ACT_UID ? ACT : null),
        }),
      },
      plugin: (name: string) =>
        name === 'zhao-sso'
          ? { service: (n: string) => (n === 'sso-sop' ? sop : n === 'sso-msg' ? msg : {}) }
          : undefined,
    };
    return { strapi, warn, msg, sop };
  };

  test('微信 sendNow 抛错（模板缺失）时站内信仍发送一次，且错误仅 warn 不抛出', async () => {
    const sendNow = jest.fn().mockRejectedValue(new Error('消息模板未找到或未启用: act_promoted'));
    const sendInApp = jest.fn().mockResolvedValue({ job: { id: 1 } });
    const { strapi, warn } = buildStrapi({ sendNow, sendInApp });
    const svc = activityServiceFactory({ strapi } as any);

    await expect(svc.notifyPromoted(1, 10)).resolves.toBeUndefined();

    expect(sendInApp).toHaveBeenCalledTimes(1);
    expect(sendInApp).toHaveBeenCalledWith({
      user: 5,
      scene: 'activity.promoted',
      params: { name: '线下活动', startTime: '2026-10-01T02:00:00.000Z' },
      dedupeKey: 'activity:promoted:1:10',
    });
    expect(sendNow).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('promote wx notify failed'));
  });

  test('无 sso 映射时微信跳过且记 warn（站内信同样记 warn 而非静默）', async () => {
    const sendNow = jest.fn();
    const { strapi, warn } = buildStrapi({ resolveSso: null, sendNow });
    const svc = activityServiceFactory({ strapi } as any);

    await svc.notifyPromoted(2, 10);

    expect(sendNow).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('promote wx notify skip: no sso mapping'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('inapp notify skip: no sso mapping'));
  });

  test('活动不存在时静默返回，不触碰任何通道', async () => {
    const sendNow = jest.fn();
    const sendInApp = jest.fn();
    const { strapi } = buildStrapi({ sendNow, sendInApp });
    strapi.db.query = () => ({ findOne: jest.fn().mockResolvedValue(null) });
    const svc = activityServiceFactory({ strapi } as any);

    await svc.notifyPromoted(3, 999);

    expect(sendNow).not.toHaveBeenCalled();
    expect(sendInApp).not.toHaveBeenCalled();
  });
});
