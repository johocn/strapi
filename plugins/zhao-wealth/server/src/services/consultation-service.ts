'use strict';

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 创建预约咨询
   */
  async createBooking(userId: string, bookingData: {
    name: string;
    phone: string;
    productId?: number;
    portfolioPlanId?: number;
    preferredTime?: string;
    preferredChannel?: string;
    message?: string;
  }) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-consultation');
    const record = await query.create({
      data: {
        userId,
        name: bookingData.name,
        phone: bookingData.phone,
        productId: bookingData.productId || null,
        portfolioPlanId: bookingData.portfolioPlanId || null,
        preferredTime: bookingData.preferredTime || null,
        preferredChannel: bookingData.preferredChannel || 'branch',
        message: bookingData.message || null,
        status: 'pending',
      },
    });
    return record;
  },

  /**
   * 获取用户的预约列表
   */
  async getBookings(userId: string) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-consultation');
    const records = await query.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      limit: 100,
    });
    return records;
  },

  /**
   * 取消预约
   */
  async cancelBooking(bookingId: number) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-consultation');
    const record = await query.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
    return record;
  },
});
