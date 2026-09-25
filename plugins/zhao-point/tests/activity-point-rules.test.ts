import config from '../server/src/config';

describe('活动后积分规则默认配置', () => {
  const rules: any = (config as any).default.increaseRules;

  test('四条活动后规则均已定义', () => {
    for (const action of ['activity_reward', 'tour_checkin', 'tour_main', 'tour_finale']) {
      expect(rules[action]).toBeDefined();
    }
  });

  test('积分数与 activity.ts 的业务兜底值对齐', () => {
    expect(rules.activity_reward.points).toBe(0);
    expect(rules.tour_checkin.points).toBe(10);
    expect(rules.tour_main.points).toBe(50);
    expect(rules.tour_finale.points).toBe(100);
  });

  test('均为非一次性 + taskGroup=other（幂等由报名/打卡唯一性保证）', () => {
    for (const action of ['activity_reward', 'tour_checkin', 'tour_main', 'tour_finale']) {
      expect(rules[action].isOneTime).toBe(false);
      expect(rules[action].taskGroup).toBe('other');
      expect(rules[action].limitPerDay).toBe(0);
    }
  });
});