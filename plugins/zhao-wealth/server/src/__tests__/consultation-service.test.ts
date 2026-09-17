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

describe('consultation-service 服务人分级匹配', () => {
  let service: any;
  const mockContactQuery = jest.fn();
  const mockCfgFindOne = jest.fn();
  const mockSsoFindById = jest.fn();

  const mockQuery2 = jest.fn().mockImplementation((name: string) => {
    if (name === 'plugin::zhao-wealth.wealth-consultation') {
      return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() };
    }
    if (name === 'plugin::zhao-wealth.wealth-consult-contact') {
      return mockContactQuery();
    }
    if (name === 'plugin::zhao-wealth.wealth-consult-config') {
      return { findOne: mockCfgFindOne };
    }
    return { create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn(), findOne: jest.fn() };
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    const factory = require('../services/consultation-service').default;
    service = factory({
      strapi: {
        db: { query: mockQuery2 },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        plugin: jest.fn().mockReturnValue({ service: jest.fn().mockReturnValue({ findById: mockSsoFindById }) }),
      },
    });
  });

  it('推荐人是服务人：返回该服务人配置', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({
        id: 1, inviterId: 9, nickname: '王经理', branchName: '市南支行',
        branchPhones: ['0532-88888888'], latitude: 36.07, longitude: 120.38, city: '青岛',
        enterpriseWechatQr: { url: '/uploads/ent.png' }, enterpriseWechatId: 'qd-wealth',
        personalWechatQr: null, personalWechatId: null,
      }),
    });
    const r = await service.resolveContact({ invitedBy: 9 });
    expect(r.branchName).toBe('市南支行');
    expect(r.nickname).toBe('王经理');
    expect(r.enterpriseWechatId).toBe('qd-wealth');
  });

  it('无推荐人：城市命中返回城市服务人', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([{
        id: 2, inviterId: 10, nickname: '李顾问', branchName: '李沧支行',
        branchPhones: [], latitude: 36.16, longitude: 120.43, city: '青岛',
        enterpriseWechatQr: null, enterpriseWechatId: null,
        personalWechatQr: { url: '/uploads/personal.png' }, personalWechatId: 'li-1888',
      }]),
    });
    const r = await service.resolveContact({ invitedBy: null, city: '青岛' });
    expect(r.nickname).toBe('李顾问');
    expect(r.personalWechatId).toBe('li-1888');
  });

  it('城市多服务人：有经纬度按距离最近', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([
        { id: 3, inviterId: 11, nickname: '近点', city: '青岛', latitude: 36.06, longitude: 120.37, branchPhones: [] },
        { id: 4, inviterId: 12, nickname: '远点', city: '青岛', latitude: 36.16, longitude: 120.50, branchPhones: [] },
      ]),
    });
    const r = await service.resolveContact({ invitedBy: null, city: '青岛', latitude: 36.065, longitude: 120.375 });
    expect(r.nickname).toBe('近点');
  });

  it('城市未命中：落全局配置兜底', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    });
    mockCfgFindOne.mockResolvedValue({
      enterpriseWechatQr: { url: '/uploads/global.png' },
      personalWechatQr: null,
      enterpriseWechatId: 'global-wealth',
      personalWechatId: null,
    });
    const r = await service.resolveContact({ invitedBy: null, city: '不存在市' });
    expect(r.enterpriseWechatId).toBe('global-wealth');
  });

  it('全局也无配置：空字段占位', async () => {
    mockContactQuery.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    });
    mockCfgFindOne.mockResolvedValue(null);
    const r = await service.resolveContact({ invitedBy: null, city: '不存在市' });
    expect(r.enterpriseWechatId).toBeNull();
    expect(r.personalWechatId).toBeNull();
  });

  it('管理端创建服务人配置：写入 inviterId 唯一记录', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 1, inviterId: 9 });
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue(null), create: mockCreate });
    const r = await service.adminCreateContact({ inviterId: 9, nickname: '王经理' });
    expect(r.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.inviterId).toBe(9);
  });

  it('管理端创建服务人配置：inviterId 已存在返回 400', async () => {
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue({ id: 1, inviterId: 9 }) });
    const r = await service.adminCreateContact({ inviterId: 9, nickname: '王经理' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
  });

  it('管理端更新服务人配置：inviterId 被其他记录占用返回 400', async () => {
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue({ id: 2, inviterId: 9 }) });
    const r = await service.adminUpdateContact(1, { inviterId: 9 });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
  });

  it('城市未命中且配置全局默认服务人：返回全局默认服务人', async () => {
    const findOne = jest.fn().mockResolvedValue({
      id: 5, inviterId: null, nickname: '总行服务', branchName: '吉林银行客服中心',
      branchPhones: ['0432-88886666', '13800000000'], city: null,
      enterpriseWechatQr: null, enterpriseWechatId: null,
      personalWechatQr: null, personalWechatId: null,
    });
    mockContactQuery.mockReturnValue({ findOne, findMany: jest.fn().mockResolvedValue([]) });
    const r = await service.resolveContact({ invitedBy: null, city: '不存在市' });
    expect(r.nickname).toBe('总行服务');
    expect(r.branchName).toBe('吉林银行客服中心');
    expect(r.branchPhones).toEqual(['0432-88886666', '13800000000']);
  });

  it('创建全局默认服务人：inviterId 为空写入 null', async () => {
    const mockCreate = jest.fn().mockResolvedValue({ id: 6, inviterId: null });
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue(null), create: mockCreate });
    const r = await service.adminCreateContact({ inviterId: null, nickname: '总行服务', branchName: '客服中心' });
    expect(r.ok).toBe(true);
    expect(mockCreate.mock.calls[0][0].data.inviterId).toBeNull();
  });

  it('创建全局默认服务人：已存在全局默认返回 400', async () => {
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue({ id: 5, inviterId: null }) });
    const r = await service.adminCreateContact({ inviterId: null, nickname: '另一个' });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
  });

  it('更新为全局默认：其他全局默认存在返回 400', async () => {
    mockContactQuery.mockReturnValue({ findOne: jest.fn().mockResolvedValue({ id: 5, inviterId: null }) });
    const r = await service.adminUpdateContact(1, { inviterId: null });
    expect(r.ok).toBe(false);
    expect(r.code).toBe(400);
  });
});
