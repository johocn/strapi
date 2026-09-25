import { affectedCount, cancelOutcome } from '../server/src/services/activity-concurrency';

describe('活动并发判定纯逻辑', () => {
  describe('affectedCount', () => {
    test('Strapi updateMany 返回 {count:N} 对象形态', () => {
      expect(affectedCount({ count: 1 })).toBe(1);
      expect(affectedCount({ count: 0 })).toBe(0);
      expect(affectedCount({ count: 3 })).toBe(3);
    });

    test('裸数字与数字字符串', () => {
      expect(affectedCount(1)).toBe(1);
      expect(affectedCount(0)).toBe(0);
      expect(affectedCount({ count: '2' })).toBe(2);
    });

    test('异常形状回落 0（不得抛错、不得 NaN）', () => {
      expect(affectedCount(null)).toBe(0);
      expect(affectedCount(undefined)).toBe(0);
      expect(affectedCount({})).toBe(0);
      expect(affectedCount(NaN)).toBe(0);
      expect(affectedCount({ count: null })).toBe(0);
      expect(affectedCount({ count: undefined })).toBe(0);
      expect(affectedCount({ count: 'abc' })).toBe(0);
      expect(affectedCount('1')).toBe(0);
    });

    test('切勿直接 Number 对象——{count:1} 直接转数会得 NaN', () => {
      expect(Number({ count: 1 } as any)).toBeNaN();
      expect(affectedCount({ count: 1 })).toBe(1);
    });
  });

  describe('cancelOutcome', () => {
    test('active 取消：通知 + 退款 + 释放名额 + 递补', () => {
      expect(cancelOutcome({ active: 1, waiting: 0 })).toEqual({
        proceed: true,
        notify: true,
        refund: true,
        releaseSeat: true,
        promoteWaitlist: true,
      });
    });

    test('waiting 取消：仅通知，不退款/不释放名额/不递补', () => {
      expect(cancelOutcome({ active: 0, waiting: 1 })).toEqual({
        proceed: true,
        notify: true,
        refund: false,
        releaseSeat: false,
        promoteWaitlist: false,
      });
    });

    test('并发后到者（两项均 0）：无任何副作用', () => {
      expect(cancelOutcome({ active: 0, waiting: 0 })).toEqual({
        proceed: false,
        notify: false,
        refund: false,
        releaseSeat: false,
        promoteWaitlist: false,
      });
    });

    test('缺参/异常入参按 0 处理', () => {
      expect(cancelOutcome({})).toEqual(cancelOutcome({ active: 0, waiting: 0 }));
      expect(cancelOutcome(undefined as any)).toEqual(cancelOutcome({ active: 0, waiting: 0 }));
    });

    test('active 与 waiting 不会同时计数（调用方串行判定），active 优先', () => {
      expect(cancelOutcome({ active: 2, waiting: 1 }).releaseSeat).toBe(true);
    });
  });
});