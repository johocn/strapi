'use strict';

import type { Core } from '@strapi/strapi';

const PHONE_RE = /^1\d{10}$/;

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

  /**
   * 获取微信咨询配置（公开，C 端展示二维码）
   */
  async function getConsultConfig() {
    const cfgQuery = strapi.db.query('plugin::zhao-wealth.wealth-consult-config');
    const cfg = await cfgQuery.findOne({});
    if (!cfg) {
      return { enterpriseWechatQr: null, personalWechatQr: null, enterpriseWechatId: null, personalWechatId: null };
    }
    return {
      enterpriseWechatQr: cfg.enterpriseWechatQr?.url || null,
      personalWechatQr: cfg.personalWechatQr?.url || null,
      enterpriseWechatId: cfg.enterpriseWechatId || null,
      personalWechatId: cfg.personalWechatId || null,
    };
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
    return record;
  }

  return { createBooking, getBookings, cancelBooking, adminListBookings, replyBooking, getConsultConfig, adminUpdateConsultConfig };
};
