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

    // 2. 若不足limit条，补充客户偏好匹配
    if (recommendations.length < limit) {
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
      });

      if (user && user.riskPreference) {
        const matchedProducts = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
          where: {
            riskLevel: { $lte: user.riskPreference },
            status: true,
          },
          orderBy: { recommendWeight: 'desc' },
          limit: limit - recommendations.length,
        });

        for (const product of matchedProducts) {
          if (recommendations.some(r => r.productId === product.id)) continue;

          const latestSnapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
            where: { product: product.id },
            orderBy: { snapshotDate: 'desc' },
          });

          recommendations.push({
            productId: product.id,
            productName: product.productName,
            productType: product.productType,
            riskLevel: product.riskLevel,
            recommendSource: 'preference',
            recommendReason: '符合您的风险偏好',
            annual1y: latestSnapshot?.annual1y,
            latestNav: null,
          });
        }
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