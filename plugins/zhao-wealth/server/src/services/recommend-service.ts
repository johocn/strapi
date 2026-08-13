'use strict';

export default ({ strapi }) => ({
  /**
   * 获取推荐产品列表
   */
  async getRecommendations(userId: number, channelId: number, limit: number = 10) {
    const recommendations: any[] = [];

    // 1. 手动配置推荐（最高优先级）
    const manualRecommend = await strapi.db.query('plugin::zhao-wealth.wealth-recommend-config').findMany({
      where: {
        channel: channelId,
        status: true,
      },
      orderBy: { recommendOrder: 'asc' },
      limit,
      populate: ['product'],
    });

    for (const config of manualRecommend) {
      // P0修复：产品被删除时跳过，避免 NPE
      if (!config.product) continue;

      const latestSnapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
        where: { product: config.product.id },
        orderBy: { snapshotDate: 'desc' },
      });

      recommendations.push({
        productId: config.product.id,
        productName: config.product.productName,
        productType: config.product.productType,
        riskLevel: config.product.riskLevel,
        recommendSource: 'manual',
        recommendReason: config.recommendReason,
        annual1y: latestSnapshot?.annual1y,
        latestNav: null,
      });
    }

    // 2. 若不足limit条，补充评分排序（替代风险偏好匹配）
    if (recommendations.length < limit) {
      const remaining = limit - recommendations.length;
      const existingIds = recommendations.map((r: any) => r.productId);

      // 查询有评分的产品
      const scoreQuery = strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot');
      const productQuery = strapi.db.query('plugin::zhao-wealth.wealth-product');

      // 获取所有上架且未被推荐的产品
      const excludeFilter = existingIds.length > 0 ? { id: { $notIn: existingIds } } : {};
      const products = await productQuery.findMany({
        where: { status: true, ...excludeFilter },
        limit: 50,
        populate: ['company'],
      });

      // 获取每个产品的评分
      const scoredProducts = [];
      for (const product of products) {
        const score = await scoreQuery.findOne({
          where: { product: product.id, period: 'm1' },
          orderBy: { snapshotDate: 'desc' },
        });
        if (score && score.compositeScore) {
          scoredProducts.push({ ...product, score });
        }
      }

      // 按评分降序排序
      scoredProducts.sort((a: any, b: any) => Number(b.score.compositeScore) - Number(a.score.compositeScore));

      for (const product of scoredProducts.slice(0, remaining)) {
        recommendations.push({
          productId: product.id,
          productName: product.productName,
          productType: product.productType,
          riskLevel: product.riskLevel,
          recommendSource: 'score-ranking',
          recommendReason: `综合评分 ${Number(product.score.compositeScore).toFixed(0)} 分`,
          annual1y: null,
          latestNav: null,
          starRating: product.score.starRating,
          compositeScore: Number(product.score.compositeScore),
        });
      }
    }

    // 3. 若仍不足limit条，补充年化收益排名
    if (recommendations.length < limit) {
      const topProducts = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findMany({
        where: {
          annual1y: { $ne: null },
        },
        orderBy: { annual1y: 'desc' },
        limit: limit - recommendations.length,
        populate: ['product'],
      });

      for (const snapshot of topProducts) {
        // P0修复：snapshot.product 可能为 null（产品被删除）
        if (!snapshot.product) continue;
        if (recommendations.some(r => r.productId === snapshot.product.id)) continue;

        recommendations.push({
          productId: snapshot.product.id,
          productName: snapshot.product.productName,
          productType: snapshot.product.productType,
          riskLevel: snapshot.product.riskLevel,
          recommendSource: 'annual-ranking',
          recommendReason: '近一年年化收益排名靠前',
          annual1y: snapshot.annual1y,
          latestNav: null,
        });
      }
    }

    return recommendations.slice(0, limit);
  },
});
