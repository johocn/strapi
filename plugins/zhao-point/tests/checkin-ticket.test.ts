import {
  TICKET_TTL_MS,
  TICKET_PREFIX,
  newTicketToken,
  decodeScanText,
  validateTicket,
  validateManualReason,
  shouldExpire,
} from '../server/src/services/checkin-ticket';

const HEX48 = 'a'.repeat(48);

describe('到场核销票据纯逻辑', () => {
  test('有效期常量为 5 分钟', () => {
    expect(TICKET_TTL_MS).toBe(5 * 60 * 1000);
    expect(TICKET_PREFIX).toBe('atk:');
  });

  test('token 为 48 位小写 hex，且两次生成不重复', () => {
    const a = newTicketToken();
    const b = newTicketToken();
    expect(a).toMatch(/^[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });

  test('扫码文本只认 atk: 前缀，旧明文码单独识别', () => {
    expect(decodeScanText(`atk:${HEX48}`)).toEqual({ kind: 'ticket', token: HEX48 });
    expect(decodeScanText(`atk:${'A'.repeat(48)}`)).toEqual({ kind: 'invalid' }); // 大写不合法
    expect(decodeScanText('atk:short')).toEqual({ kind: 'invalid' });
    expect(decodeScanText('activity:abc123:12')).toEqual({ kind: 'legacy' });
    expect(decodeScanText('随便一串')).toEqual({ kind: 'invalid' });
    expect(decodeScanText('')).toEqual({ kind: 'invalid' });
    expect(decodeScanText(null)).toEqual({ kind: 'invalid' });
  });

  test('有效票据通过校验', () => {
    const now = Date.now();
    const r = validateTicket(
      { status: 'pending', expiresAt: new Date(now + 60_000).toISOString(), activity: 7 },
      { activityId: 7, now },
    );
    expect(r).toEqual({ ok: true });
  });

  test('不存在 / 已用 / 非 pending / 过期 / 跨活动 分别返回对应错误码', () => {
    const now = Date.now();
    const future = new Date(now + 60_000).toISOString();
    const past = new Date(now - 1000).toISOString();

    expect((validateTicket(null, { activityId: 7, now }) as any).code).toBe('invalid_token');
    expect((validateTicket({ status: 'used', expiresAt: future, activity: 7 }, { activityId: 7, now }) as any).code).toBe('ticket_used');
    expect((validateTicket({ status: 'expired', expiresAt: future, activity: 7 }, { activityId: 7, now }) as any).code).toBe('invalid_token');
    expect((validateTicket({ status: 'pending', expiresAt: past, activity: 7 }, { activityId: 7, now }) as any).code).toBe('ticket_expired');
    expect((validateTicket({ status: 'pending', expiresAt: null, activity: 7 }, { activityId: 7, now }) as any).code).toBe('ticket_expired');
    expect((validateTicket({ status: 'pending', expiresAt: future, activity: 7 }, { activityId: 8, now }) as any).code).toBe('ticket_activity_mismatch');

    const all = [
      validateTicket(null, { activityId: 7, now }),
      validateTicket({ status: 'used', expiresAt: future, activity: 7 }, { activityId: 7, now }),
      validateTicket({ status: 'pending', expiresAt: past, activity: 7 }, { activityId: 7, now }),
      validateTicket({ status: 'pending', expiresAt: future, activity: 7 }, { activityId: 8, now }),
    ];
    for (const r of all) {
      expect((r as any).ok).toBe(false);
      expect((r as any).httpStatus).toBe(400);
      expect(typeof (r as any).message).toBe('string');
    }
  });

  test('手动核销理由短于 2 字符被拒', () => {
    expect((validateManualReason('') as any).code).toBe('reason_required');
    expect((validateManualReason(' ') as any).code).toBe('reason_required');
    expect((validateManualReason('a') as any).code).toBe('reason_required');
    expect((validateManualReason(undefined) as any).code).toBe('reason_required');
    expect(validateManualReason('手机没电')).toEqual({ ok: true });
    expect(validateManualReason(' 实在没网 ')).toEqual({ ok: true }); // trim 后长度 4
  });

  test('活动关系为对象时仍能正确比对（Strapi 关系字段回归）', () => {
    const now = Date.now();
    const future = new Date(now + 60_000).toISOString();
    // Strapi db 层把 manyToOne 返回为 { id }，直接 Number() 会得 NaN 导致恒判不匹配
    expect(validateTicket({ status: 'pending', expiresAt: future, activity: { id: 7 } }, { activityId: 7, now })).toEqual({ ok: true });
    expect(
      (validateTicket({ status: 'pending', expiresAt: future, activity: { id: 8 } }, { activityId: 7, now }) as any).code,
    ).toBe('ticket_activity_mismatch');
    expect(validateTicket({ status: 'pending', expiresAt: future, activity: '7' }, { activityId: 7, now })).toEqual({ ok: true });
    expect(
      (validateTicket({ status: 'pending', expiresAt: future, activity: null }, { activityId: 7, now }) as any).code,
    ).toBe('ticket_activity_mismatch');
  });

  test('shouldExpire 只对 pending 且已过期的票为真', () => {
    const now = Date.now();
    expect(shouldExpire({ status: 'pending', expiresAt: new Date(now - 1).toISOString() }, now)).toBe(true);
    expect(shouldExpire({ status: 'pending', expiresAt: new Date(now + 1000).toISOString() }, now)).toBe(false);
    expect(shouldExpire({ status: 'used', expiresAt: new Date(now - 1).toISOString() }, now)).toBe(false);
    expect(shouldExpire(null, now)).toBe(false);
  });
});