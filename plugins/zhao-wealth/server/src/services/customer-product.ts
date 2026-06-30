'use strict';

export default ({ strapi }) => ({
  /**
   * 获取用户自选产品列表
   */
  async getUserProducts(userId: number, page: number, pageSize: number) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const customerProducts = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findMany({
      where: { user: userId },
      limit,
      offset,
      orderBy: { sortOrder: 'asc', followTime: 'desc' },
      populate: ['product'],
    });

    const total = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').count({
      where: { user: userId },
    });

    // 补充最新净值和年化
    const list = await Promise.all(customerProducts.map(async (cp) => {
      const latestNav = await strapi.db.query('api::wealth-nav.wealth-nav').findOne({
        where: { product: cp.product.id },
        orderBy: { navDate: 'desc' },
      });

      const latestSnapshot = await strapi.db.query('api::wealth-annual-snapshot.wealth-annual-snapshot').findOne({
        where: { product: cp.product.id },
        orderBy: { snapshotDate: 'desc' },
      });

      return {
        ...cp,
        latestNav,
        latestSnapshot,
      };
    }));

    return { list, page, pageSize: limit, total };
  },

  /**
   * 添加自选产品
   */
  async addProduct(userId: number, productId: number, channelId: number) {
    // 检查是否已存在
    const existing = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findOne({
      where: { user: userId, product: productId },
    });

    if (existing) {
      return existing;
    }

    return await strapi.db.query('api::wealth-customer-product.wealth-customer-product').create({
      data: {
        user: userId,
        product: productId,
        channel: channelId,
        followTime: new Date(),
        sortOrder: 0,
      },
    });
  },

  /**
   * 删除自选产品
   */
  async removeProduct(userId: number, customerProductId: number) {
    const cp = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findOne({
      where: { id: customerProductId },
    });

    if (!cp || cp.user !== userId) {
      return null;
    }

    return await strapi.db.query('api::wealth-customer-product.wealth-customer-product').delete({
      where: { id: customerProductId },
    });
  },

  /**
   * 获取渠道下所有客户自选统计
   */
  async getChannelProductsStats(channelId: number) {
    const stats = await strapi.db.query('api::wealth-customer-product.wealth-customer-product').findMany({
      where: { channel: channelId },
      populate: ['product', 'user'],
    });

    // 按产品统计关注人数
    const productStats: Record<number, { productId: number; productName: string; followCount: number }> = {};

    for (const cp of stats) {
      const productId = cp.product.id;
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: cp.product.productName,
          followCount: 0,
        };
      }
      productStats[productId].followCount++;
    }

    return Object.values(productStats).sort((a, b) => b.followCount - a.followCount);
  },
});