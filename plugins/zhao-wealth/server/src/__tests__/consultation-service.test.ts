'use strict';

describe('consultation-service 三渠道', () => {
  let service: any;
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockUpdate = jest.fn();
  const mockCount = jest.fn();

  const mockQuery = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-consultation') {
      return { create: mockCreate, update: mockUpdate, findMany: mockFindMany, count: mockCount };
    }
    return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/consultation-service').default;
    service = factory({ strapi: { db: { query: mockQuery } } });
  });

  it('phone 渠道：phone 必填且 11 位，name 选填', async () => {
    mockCreate.mockResolvedValue({ id: 1 });
    const ok = await service.createBooking('u1', { submitType: 'phone', name: '小李', phone: '13800138000' });
    expect(ok.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.submitType).toBe('phone');
  });

  it('phone 渠道：手机号非法返回错误', async () => {
    const bad = await service.createBooking('u1', { submitType: 'phone', phone: '123' });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('message 渠道：留言必填，联系方式至少一项', async () => {
    mockCreate.mockResolvedValue({ id: 2 });
    const ok = await service.createBooking('u1', {
      submitType: 'message', name: '', message: '想了解净值型理财',
      contactType: 'wechat', contactValue: 'wx_abc',
    });
    expect(ok.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.submitType).toBe('message');
    expect(mockCreate.mock.calls[0][0].data.contactValue).toBe('wx_abc');
  });

  it('message 渠道：无留言内容返回错误', async () => {
    const bad = await service.createBooking('u1', { submitType: 'message', message: '', contactType: 'phone', contactValue: '13800138000' });
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe(400);
  });

  it('wechat 提交型：wechatType 与 contactValue 必填', async () => {
    mockCreate.mockResolvedValue({ id: 3 });
    const ok = await service.createBooking('u1', { submitType: 'wechat', wechatType: 'personal', contactValue: 'wx_abc' });
    expect(ok.ok).toBe(true);
  });

  it('管理端回复：写入 reply/repliedAt 并置状态 replied', async () => {
    mockUpdate.mockResolvedValue({ id: 1, reply: '已为您安排理财师' });
    const r = await service.replyBooking(1, '已为您安排理财师');
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.reply).toBe('已为您安排理财师');
    expect(data.status).toBe('replied');
    expect(data.repliedAt).toBeTruthy();
    expect(r.ok).toBe(true);
  });

  it('管理端列表：支持状态与渠道筛选分页', async () => {
    mockFindMany.mockResolvedValue([{ id: 1, submitType: 'message' }]);
    mockCount.mockResolvedValue(1);
    const r = await service.adminListBookings({ page: 1, pageSize: 20, status: 'pending', submitType: 'message' });
    const where: any = mockFindMany.mock.calls[0][0].where;
    expect(where.status).toBe('pending');
    expect(where.submitType).toBe('message');
    expect(r.total).toBe(1);
  });

  it('咨询配置：返回二维码 URL 与微信号（无配置时返回 null 字段）', async () => {
    const mockCfgFindOne = jest.fn();
    mockQuery.mockImplementation((name: string) => {
      if (name === 'plugin::zhao-wealth.wealth-consultation') {
        return { create: mockCreate, update: mockUpdate, findMany: mockFindMany, count: mockCount };
      }
      if (name === 'plugin::zhao-wealth.wealth-consult-config') {
        return { findOne: mockCfgFindOne };
      }
      return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
    });
    mockCfgFindOne.mockResolvedValue({
      enterpriseWechatQr: { url: '/uploads/ent.png' },
      personalWechatQr: null,
      enterpriseWechatId: 'joho-wealth',
      personalWechatId: null,
    });
    const cfg = await service.getConsultConfig();
    expect(cfg.enterpriseWechatId).toBe('joho-wealth');
    expect(cfg.enterpriseWechatQr).toBe('/uploads/ent.png');
    expect(cfg.personalWechatQr).toBeNull();
  });
});
