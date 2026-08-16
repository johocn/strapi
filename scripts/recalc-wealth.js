// 重算指定产品的风险指标 + 综合评分快照（调用插件真实服务，避免 HTTP 鉴权）
// 用法: node scripts/recalc-wealth.js [productId] [period]
const { createStrapi } = require('@strapi/strapi');

const PRODUCT_ID = Number(process.argv[2] || 3);
const PERIOD = process.argv[3] || 'm1';

async function main() {
  const strapi = await createStrapi().load();

  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    console.log(`[recalc] 产品=${PRODUCT_ID}, 快照日期=${todayStr}`);

    // 1. 重算风险指标（4 个周期 × 4 项指标）
    const riskMetricService = strapi.service('plugin::zhao-wealth.risk-metric-service');
    await riskMetricService.calculateAndSaveMetrics(PRODUCT_ID, today);
    console.log('[recalc] 风险指标重算完成');

    // 2. 重算评分快照
    const scoringService = strapi.service('plugin::zhao-wealth.scoring-service');
    await scoringService.calculateAndSaveScoreSnapshot(PRODUCT_ID, todayStr, PERIOD);
    const score = await scoringService.getScoreBreakdown(PRODUCT_ID, PERIOD);
    console.log('[recalc] 评分快照重算完成');
    console.log(JSON.stringify({
      compositeScore: score && score.compositeScore,
      starRating: score && score.starRating,
      returnScore: score && score.returnScore,
      volatilityScore: score && score.volatilityScore,
      drawdownScore: score && score.drawdownScore,
      weightProfile: score && score.weightProfile,
      weights: score && score.weights,
      period: score && score.period,
    }, null, 2));
  } catch (error) {
    console.error('[recalc] 失败:', error.message);
    process.exitCode = 1;
  } finally {
    await strapi.destroy();
  }
}

main();
