import { collectMissingRules } from '../server/src/services/seed-rules';

const inc = {
  activity_signup: { points: 5, description: '活动报名', taskGroup: 'other' },
  activity_attend: { points: 20, description: '活动到场签到', taskGroup: 'other', extraConfig: { geoRequired: true } },
};
const dec = {
  refund_deduct: { points: 0, description: '退款扣回', taskGroup: 'penalty' },
};

describe('collectMissingRules', () => {
  test('缺失的 increase/decrease 规则全部收集且 category 正确', () => {
    const missing = collectMissingRules(inc, dec, []);
    expect(missing.map((m) => [m.action, m.category])).toEqual([
      ['activity_signup', 'increase'],
      ['activity_attend', 'increase'],
      ['refund_deduct', 'decrease'],
    ]);
  });

  test('已存在的 action 不重复收集', () => {
    const missing = collectMissingRules(inc, dec, ['activity_signup', 'refund_deduct']);
    expect(missing.map((m) => m.action)).toEqual(['activity_attend']);
  });

  test('两侧均为 undefined 时返回空数组不抛错', () => {
    expect(collectMissingRules(undefined, undefined, [])).toEqual([]);
  });

  test('extraConfig 等字段原样保留', () => {
    const missing = collectMissingRules(inc, undefined, ['activity_signup']);
    expect(missing[0].rule.extraConfig).toEqual({ geoRequired: true });
  });
});
