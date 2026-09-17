'use strict';

import type { Core } from '@strapi/strapi';

const PHONE_RE = /^1\d{10}$/;

const CONTACT_UID = 'plugin::zhao-wealth.wealth-consult-contact';
const CONFIG_UID = 'plugin::zhao-wealth.wealth-consult-config';

/** 内存缓存：inviter:{id} / city:{name} / global。服务人配置低频变更，写后清空即可 */
const contactCache = new Map<string, any>();

function cacheGet<T = any>(key: string): T | undefined {
  return contactCache.get(key) as T | undefined;
}
function cacheSet(key: string, value: any) {
  contactCache.set(key, value);
}
function cacheClear() {
  contactCache.clear();
}

/** 经纬度距离（米，Haversine） */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 服务人记录 → 对外响应结构（媒体字段取 url） */
function shapeContact(c: any) {
  if (!c) return null;
  let phones: string[] = [];
  if (Array.isArray(c.branchPhones)) phones = c.branchPhones;
  else if (c.branchPhones) {
    try { phones = JSON.parse(c.branchPhones); } catch { phones = []; }
  }
  return {
    nickname: c.nickname || null,
    branchName: c.branchName || null,
    branchPhones: phones,
    enterpriseWechatQr: c.enterpriseWechatQr?.url || null,
    personalWechatQr: c.personalWechatQr?.url || null,
    enterpriseWechatId: c.enterpriseWechatId || null,
    personalWechatId: c.personalWechatId || null,
  };
}

/** 同城多服务人就近选取：有客户经纬度按距离最近；无则 id 升序取第一 */
function pickNearest(list: any[], latitude?: number | null, longitude?: number | null) {
  if (list.length <= 1) return list[0];
  if (latitude == null || longitude == null) return list[0];
  let best = list[0];
  let bestDist = Infinity;
  for (const c of list) {
    if (c.latitude == null || c.longitude == null) continue;
    const d = haversineMeters(latitude, longitude, Number(c.latitude), Number(c.longitude));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query('plugin::zhao-wealth.wealth-consultation');

  function fail(code: number, msg: string) {
    return { ok: false, code, msg };
  }

  /**
   * 创建预约咨询（三渠道）
   * submitType: phone | wechat | message
   */
  async function createBooking(userId: string, bookingData: {
    submitType?: string;
    name?: string;
    phone?: string;
    contactType?: string;
    contactValue?: string;
    wechatType?: string;
    message?: string;
    productId?: number;
    portfolioPlanId?: number;
    preferredTime?: string;
    preferredChannel?: string;
  }) {
    const submitType = bookingData.submitType || 'phone';

    if (submitType === 'phone') {
      if (!bookingData.phone || !PHONE_RE.test(bookingData.phone)) {
        return fail(400, '请输入正确的11位手机号');
      }
    } else if (submitType === 'wechat') {
      if (!bookingData.wechatType || !bookingData.contactValue) {
        return fail(400, '请选择微信类型并填写微信号');
      }
    } else if (submitType === 'message') {
      if (!bookingData.message || !String(bookingData.message).trim()) {
        return fail(400, '请输入留言内容');
      }
      if (!bookingData.contactType || !bookingData.contactValue) {
        return fail(400, '请至少预留一种联系方式（电话/邮箱/微信）');
      }
    } else {
      return fail(400, '无效的提交渠道');
    }

    const record = await query().create({
      data: {
        userId,
        submitType,
        name: bookingData.name || null,
        phone: bookingData.phone || null,
        contactType: bookingData.contactType || null,
        contactValue: bookingData.contactValue || null,
        wechatType: bookingData.wechatType || null,
        message: bookingData.message || null,
        productId: bookingData.productId || null,
        portfolioPlanId: bookingData.portfolioPlanId || null,
        preferredTime: bookingData.preferredTime || null,
        preferredChannel: bookingData.preferredChannel || 'branch',
        status: 'pending',
      },
    });
    return { ok: true, record };
  }

  /**
   * 获取用户的预约/留言列表
   */
  async function getBookings(userId: string) {
    const records = await query().findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit: 100,
    });
    return records;
  }

  /**
   * 取消预约
   */
  async function cancelBooking(bookingId: number) {
    const record = await query().update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
    return record;
  }

  /**
   * 管理端：留言/咨询列表（分页 + 状态/渠道筛选）
   */
  async function adminListBookings(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    submitType?: string;
  }) {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 20, 100);
    const offset = (page - 1) * pageSize;

    const where: any = {};
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.submitType && params.submitType !== 'all') where.submitType = params.submitType;

    const [records, total] = await Promise.all([
      query().findMany({ where, orderBy: { createdAt: 'desc' }, limit: pageSize, offset }),
      query().count({ where }),
    ]);

    return { records, total, page, pageSize };
  }

  /**
   * 管理端：回复留言（置 replied 状态）
   */
  async function replyBooking(bookingId: number, reply: string) {
    if (!reply || !String(reply).trim()) {
      return fail(400, '请输入回复内容');
    }
    const record = await query().update({
      where: { id: bookingId },
      data: { reply, repliedAt: new Date().toISOString(), status: 'replied' },
    });
    return { ok: true, record };
  }

  /** 按邀请人（服务人）查询配置，缓存键 inviter:{id} */
  async function findContactByInviter(inviterId: number) {
    const key = `inviter:${inviterId}`;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const contact = await strapi.db.query(CONTACT_UID).findOne({ where: { inviterId } });
    cacheSet(key, contact || null);
    return contact || null;
  }

  /** 按城市查询服务人列表（id 升序），缓存键 city:{name} */
  async function findContactsByCity(city: string) {
    const key = `city:${city}`;
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const list = await strapi.db.query(CONTACT_UID).findMany({
      where: { city },
      orderBy: { id: 'asc' },
    });
    cacheSet(key, list);
    return list;
  }

  /** 全局配置兜底（企业微信无图仅返回个人微信），缓存键 global */
  async function getGlobalConfig() {
    const key = 'global';
    const hit = cacheGet(key);
    if (hit !== undefined) return hit;
    const cfg = await strapi.db.query(CONFIG_UID).findOne({});
    const shaped = {
      nickname: null,
      branchName: null,
      branchPhones: [],
      enterpriseWechatQr: cfg?.enterpriseWechatQr?.url || null,
      personalWechatQr: cfg?.personalWechatQr?.url || null,
      enterpriseWechatId: cfg?.enterpriseWechatId || null,
      personalWechatId: cfg?.personalWechatId || null,
    };
    cacheSet(key, shaped);
    return shaped;
  }

  /**
   * 服务人联系方式分级匹配：
   * 1. 有推荐人且该推荐人是服务人 → 返回服务人配置
   * 2. 无推荐人/推荐人非服务人 → 城市就近（同城多服务人按经纬度最近）
   * 3. 城市未命中 → 全局配置兜底（企业微信无图仅个人微信）
   * 4. 全局也无 → 空字段占位
   */
  async function resolveContact(params: {
    invitedBy?: number | null;
    city?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) {
    if (params.invitedBy) {
      const inviterContact = await findContactByInviter(params.invitedBy);
      if (inviterContact) return shapeContact(inviterContact);
    }
    if (params.city) {
      const list = await findContactsByCity(params.city);
      if (list.length > 0) {
        const pick = pickNearest(list, params.latitude, params.longitude);
        return shapeContact(pick);
      }
    }
    return getGlobalConfig();
  }

  /** 管理端：服务人配置列表（分页） */
  async function adminListContacts(params: { page?: number; pageSize?: number; city?: string }) {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 20, 100);
    const offset = (page - 1) * pageSize;
    const where: any = {};
    if (params.city) where.city = params.city;

    const [records, total] = await Promise.all([
      strapi.db.query(CONTACT_UID).findMany({
        where, orderBy: { id: 'desc' }, limit: pageSize, offset,
      }),
      strapi.db.query(CONTACT_UID).count({ where }),
    ]);
    return { records, total, page, pageSize };
  }

  /** 管理端：创建服务人配置 */
  async function adminCreateContact(data: any) {
    if (!data.inviterId) return fail(400, '请选择服务人');
    const existing = await strapi.db.query(CONTACT_UID).findOne({ where: { inviterId: Number(data.inviterId) } });
    if (existing) return fail(400, '该服务人已配置，请直接编辑');
    const payload: any = {
      inviterId: Number(data.inviterId),
      nickname: data.nickname || null,
      branchName: data.branchName || null,
      branchPhones: data.branchPhones ?? null,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      city: data.city || null,
    };
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;
    const record = await strapi.db.query(CONTACT_UID).create({ data: payload });
    cacheClear();
    return { ok: true, record };
  }

  /** 管理端：更新服务人配置 */
  async function adminUpdateContact(id: number, data: any) {
    if (data.inviterId !== undefined) {
      const dup = await strapi.db.query(CONTACT_UID).findOne({ where: { inviterId: Number(data.inviterId) } });
      if (dup && dup.id !== id) return fail(400, '该服务人已被其他配置占用');
    }
    const payload: any = {};
    if (data.inviterId !== undefined) payload.inviterId = Number(data.inviterId);
    if (data.nickname !== undefined) payload.nickname = data.nickname;
    if (data.branchName !== undefined) payload.branchName = data.branchName;
    if (data.branchPhones !== undefined) payload.branchPhones = data.branchPhones;
    if (data.latitude !== undefined) payload.latitude = data.latitude != null ? Number(data.latitude) : null;
    if (data.longitude !== undefined) payload.longitude = data.longitude != null ? Number(data.longitude) : null;
    if (data.city !== undefined) payload.city = data.city;
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;
    const record = await strapi.db.query(CONTACT_UID).update({ where: { id }, data: payload });
    cacheClear();
    return { ok: true, record };
  }

  /** 管理端：删除服务人配置 */
  async function adminDeleteContact(id: number) {
    await strapi.db.query(CONTACT_UID).delete({ where: { id } });
    cacheClear();
    return { ok: true };
  }

  /**
   * 获取微信咨询配置（公开，C 端展示二维码）
   */
  async function getConsultConfig() {
    return getGlobalConfig();
  }

  /**
   * 管理端：更新微信咨询配置（单条 upsert）
   */
  async function adminUpdateConsultConfig(data: {
    enterpriseWechatQr?: number;
    personalWechatQr?: number;
    enterpriseWechatId?: string;
    personalWechatId?: string;
  }) {
    const cfgQuery = strapi.db.query('plugin::zhao-wealth.wealth-consult-config');
    const existing = await cfgQuery.findOne({});
    const payload: any = {};
    if (data.enterpriseWechatQr !== undefined) payload.enterpriseWechatQr = data.enterpriseWechatQr;
    if (data.personalWechatQr !== undefined) payload.personalWechatQr = data.personalWechatQr;
    if (data.enterpriseWechatId !== undefined) payload.enterpriseWechatId = data.enterpriseWechatId;
    if (data.personalWechatId !== undefined) payload.personalWechatId = data.personalWechatId;

    const record = existing
      ? await cfgQuery.update({ where: { id: existing.id }, data: payload })
      : await cfgQuery.create({ data: payload });
    cacheClear();
    return record;
  }

  return {
    createBooking,
    getBookings,
    cancelBooking,
    adminListBookings,
    replyBooking,
    getConsultConfig,
    adminUpdateConsultConfig,
    resolveContact,
    adminListContacts,
    adminCreateContact,
    adminUpdateContact,
    adminDeleteContact,
  };
};
