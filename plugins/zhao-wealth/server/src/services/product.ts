'use strict';

export default ({ strapi }) => ({
  /**
   * 获取产品列表
   */
  async findList(filters: any, page: number = 1, pageSize: number = 100) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      where: filters,
      limit,
      offset,
      populate: ['company'],
    });

    const total = await strapi.db.query('plugin::zhao-wealth.wealth-product').count({
      where: filters,
    });

    return { list: products, page, pageSize: limit, total };
  },

  /**
   * 获取产品详情
   */
  async findOne(id: number) {
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id },
      populate: ['company'],
    });

    // 获取最新净值
    const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
      where: { product: id },
      orderBy: { navDate: 'desc' },
    });

    return {
      ...product,
      latestNav,
    };
  },

  /**
   * 创建产品
   */
  async create(data: any) {
    return strapi.db.query('plugin::zhao-wealth.wealth-product').create({ data });
  },

  /**
   * 更新产品
   */
  async update(id: number, data: any) {
    return strapi.db.query('plugin::zhao-wealth.wealth-product').update({
      where: { id },
      data,
    });
  },

  /**
   * 删除产品
   */
  async delete(id: number) {
    return strapi.db.query('plugin::zhao-wealth.wealth-product').delete({
      where: { id },
    });
  },
});