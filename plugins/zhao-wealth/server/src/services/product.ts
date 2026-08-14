'use strict';

/**
 * 产品服务（C端）
 * 提供产品列表/详情查询，并聚合 latestNav / latestAnnual1m / score / peerRankPercentile
 * 以满足前端 annual-card.vue 和榜单的展示需求
 */
export default ({ strapi }) => ({
  /**
   * 获取产品列表（含聚合数据）
   * @param filters 查询条件
   * @param page 页码
   * @param pageSize 每页数量
   * @param options 额外参数：sortBy、period、productName 模糊搜索
   */
  async findList(filters: any, page: number = 1, pageSize: number = 100, options: any = {}) {
    const limit = Math.min(pageSize, 500);
    const offset = (page - 1) * limit;

    const { sortBy, period = 'm1' } = options;

    // 1. 查询产品列表
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      where: filters,
      limit,
      offset,
      populate: ['company'],
    });

    const total = await strapi.db.query('plugin::zhao-wealth.wealth-product').count({
      where: filters,
    });

    if (products.length === 0) {
      return { list: [], page, pageSize: limit, total };
    }

    // 2. 批量查询聚合数据
    const productIds = products.map((p: any) => p.id);
    const enrichedMap = await this.enrichProducts(productIds, period);

    // 3. 组装最终结果
    let list = products.map((product: any) => ({
      ...product,
      latestNav: enrichedMap[product.id]?.latestNav || null,
      latestAnnual1m: enrichedMap[product.id]?.latestAnnual1m ?? null,
      score: enrichedMap[product.id]?.score || null,
      peerRankPercentile: enrichedMap[product.id]?.peerRankPercentile ?? null,
    }));

    // 4. 内存排序（后端原生 orderBy 无法跨表排序）
    if (sortBy) {
      list = sortProducts(list, sortBy);
    }

    return { list, page, pageSize: limit, total };
  },

  /**
   * 获取产品详情（含最新净值）
   */
  async findOne(id: number) {
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id },
      populate: ['company'],
    });

    if (!product) return null;

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
   * 批量查询产品的聚合数据（latestNav / latestAnnual1m / score / peerRankPercentile）
   * Strapi db.query 默认不返回关联外键，故按产品逐个查询最新一条
   * 产品列表分页通常 ≤100 条，逐条查询可接受
   */
  async enrichProducts(productIds: number[], period: string = 'm1') {
    const result: Record<number, any> = {};

    if (!productIds.length) return result;

    for (const pid of productIds) {
      // 最新净值
      const latestNav = await strapi.db.query('plugin::zhao-wealth.wealth-nav').findOne({
        where: { product: pid },
        orderBy: { navDate: 'desc' },
      });

      // 最新年化快照
      const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
        where: { product: pid },
        orderBy: { snapshotDate: 'desc' },
      });

      // 最新评分快照
      const score = await strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot').findOne({
        where: { product: pid, period },
        orderBy: { snapshotDate: 'desc' },
      });

      // 最新同类排名指标（metricName=rankPercentile 那行）
      const rankMetric = await strapi.db.query('plugin::zhao-wealth.wealth-risk-metric').findOne({
        where: { product: pid, period, metricName: 'rankPercentile' },
        orderBy: { snapshotDate: 'desc' },
      });

      result[pid] = {
        latestNav: latestNav || null,
        latestAnnual1m: snapshot ? Number(snapshot.annual1m) : null,
        score: score || null,
        peerRankPercentile: rankMetric?.metricValue != null
          ? Number(rankMetric.metricValue)
          : null,
      };
    }

    return result;
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

/**
 * 内存排序：支持综合评分、近1月年化、波动率
 */
function sortProducts(list: any[], sortBy: string): any[] {
  const sorted = [...list];
  switch (sortBy) {
    case 'score':
      // 综合评分降序，无评分排末尾
      sorted.sort((a, b) => {
        const sa = a.score?.compositeScore ?? -1;
        const sb = b.score?.compositeScore ?? -1;
        return sb - sa;
      });
      break;
    case 'annual1m':
      // 近1月年化降序，无数据排末尾
      sorted.sort((a, b) => {
        const ra = a.latestAnnual1m ?? -Infinity;
        const rb = b.latestAnnual1m ?? -Infinity;
        return rb - ra;
      });
      break;
    case 'volatility':
      // 波动率升序（越低越好），无数据排末尾
      sorted.sort((a, b) => {
        // 波动率在 risk-metric 表中，未在 enrichProducts 中加载
        // 这里用 score.volatilityScore 反向排序近似（分数越高波动控制越好）
        const va = a.score?.volatilityScore ?? -1;
        const vb = b.score?.volatilityScore ?? -1;
        return vb - va;
      });
      break;
  }
  return sorted;
}
