import {
  detectStatusChange,
  audienceFor,
  TERMINAL_STATUSES,
} from '../server/src/services/activity-notice';

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
