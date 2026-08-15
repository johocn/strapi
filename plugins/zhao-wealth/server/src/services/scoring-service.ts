'use strict';

import type { Core } from '@strapi/strapi';

interface ScoreBreakdown {
  compositeScore: number;
  starRating: number;
  returnScore: number;
  volatilityScore: number;
  drawdownScore: number;
  peerRankScore: number;
  weightProfile: string;
  period: string;
  // 权重与标尺（用于前端公开计算公式）
  weights: { returns: number; volatility: number; drawdown: number; peerRank: number };
  scales: { returnScale: number; volatilityScale: number; drawdownScale: number };
}

interface ProductWithMetrics {
  productId: number;
  annualReturn: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  rankPercentile: number | null;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const config = strapi.config.get('plugin::zhao-wealth') as any;
  const scoreWeights = config?.scoreWeights || {};
  const scoreScales = config?.scoreScales || { returnScale: 0.06, volatilityScale: 0.10, drawdownScale: 0.05 };
  const starThresholds = config?.starThresholds || { five: 90, four: 75, three: 60, two: 40 };

  // 周期到年化快照字段的映射
  const PERIOD_TO_ANNUAL_FIELD: Record<string, string> = {
    m1: 'annual1m',
    m3: 'annual3m',
    m6: 'annual6m',
    y1: 'annual1y',
  };

  // 周期到风险指标表的 period 值映射
  const PERIOD_TO_METRIC_PERIOD: Record<string, string> = {
    m1: 'm1',
    m3: 'm3',
    m6: 'm6',
    y1: 'y1',
  };

  /**
   * 获取产品的权重配置 key
   * 优先匹配 productType:operationMode，回退到 productType
   */
  function getWeightProfile(productType: string, operationMode: string | null): string {
    if (operationMode) {
      const specificKey = `${productType}:${operationMode}`;
      if (scoreWeights[specificKey]) {
        return specificKey;
      }
    }
    return productType;
  }

  /**
   * 获取权重配置
   */
  function getWeights(weightProfile: string) {
    return scoreWeights[weightProfile] || scoreWeights['bank-wealth'] || { returns: 0.30, volatility: 0.25, drawdown: 0.25, peerRank: 0.20 };
  }

  /**
   * 将指标值按绝对标尺归一化到 0-100
   * 收益：值越大分越高，达到 returnScale 即 100 分
   * 波动率/回撤：值越小分越高
   * 同类排名样本过小时不做百分位归一化，直接使用绝对标尺
   */
  function clampScore(n: number): number {
    if (isNaN(n) || !isFinite(n)) return 50;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  /**
   * 收益得分（0-100）：年化收益 / returnScale，封顶 100
   */
  function absoluteReturnScore(annualReturn: number | null): number {
    if (annualReturn === null || isNaN(Number(annualReturn))) return 50;
    return clampScore((Number(annualReturn) / scoreScales.returnScale) * 100);
  }

  /**
   * 波动得分（0-100）：波动率越低分越高，达到 volatilityScale 即 0 分
   */
  function absoluteVolatilityScore(volatility: number | null): number {
    if (volatility === null || isNaN(Number(volatility))) return 50;
    return clampScore((1 - Number(volatility) / scoreScales.volatilityScale) * 100);
  }

  /**
   * 回撤得分（0-100）：最大回撤越小分越高，达到 drawdownScale 即 0 分（maxDrawdown 为负）
   */
  function absoluteDrawdownScore(maxDrawdown: number | null): number {
    if (maxDrawdown === null || isNaN(Number(maxDrawdown))) return 50;
    return clampScore((1 + Number(maxDrawdown) / scoreScales.drawdownScale) * 100);
  }

  /**
   * 查询单个产品指定周期的指标（年化收益 + 风险指标），不依赖同类样本
   */
  async function getProductMetrics(productId: number, period: string): Promise<ProductWithMetrics> {
    const annualField = PERIOD_TO_ANNUAL_FIELD[period] || 'annual1m';
    const metricPeriod = PERIOD_TO_METRIC_PERIOD[period] || 'm1';

    const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: { product: productId },
      orderBy: { snapshotDate: 'desc' },
    });
    const annualReturn = snapshot ? Number(snapshot[annualField]) : null;

    const metricQuery = strapi.db.query('plugin::zhao-wealth.wealth-risk-metric');
    const metricMap: Record<string, number | null> = { volatility: null, maxDrawdown: null, rankPercentile: null };
    for (const name of Object.keys(metricMap)) {
      const records = await metricQuery.findMany({
        where: { product: productId, period: metricPeriod, metricName: name },
        orderBy: { snapshotDate: 'desc' },
        limit: 1,
      });
      metricMap[name] = records.length > 0 && records[0].metricValue !== null
        ? Number(records[0].metricValue)
        : null;
    }

    return {
      productId,
      annualReturn: annualReturn !== null && !isNaN(annualReturn) ? annualReturn : null,
      volatility: metricMap['volatility'],
      maxDrawdown: metricMap['maxDrawdown'],
      rankPercentile: metricMap['rankPercentile'],
    };
  }

  /**
   * 评分转星级
   */
  function scoreToStars(score: number): number {
    if (score >= starThresholds.five) return 5;
    if (score >= starThresholds.four) return 4;
    if (score >= starThresholds.three) return 3;
    if (score >= starThresholds.two) return 2;
    return 1;
  }

  /**
   * 计算单个产品的评分（绝对标尺，不依赖同类样本量）
   */
  async function calculateScore(productId: number, period: string): Promise<ScoreBreakdown | null> {
    // 1. 获取产品信息
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });
    if (!product) return null;

    const weightProfile = getWeightProfile(product.productType, product.operationMode);
    const weights = getWeights(weightProfile);

    // 2. 获取当前产品指标
    const metrics = await getProductMetrics(productId, period);

    // 3. 各维度绝对评分（0-100）
    const returnScore = absoluteReturnScore(metrics.annualReturn);
    const volatilityScore = absoluteVolatilityScore(metrics.volatility);
    const drawdownScore = absoluteDrawdownScore(metrics.maxDrawdown);
    // 同类排名样本过少，无统计意义，统一给中性分且不参与加权（权重已为 0）
    const peerRankScore = 50;

    // 4. 加权求和
    const compositeScore = Math.round(
      returnScore * weights.returns +
      volatilityScore * weights.volatility +
      drawdownScore * weights.drawdown +
      peerRankScore * weights.peerRank
    );

    return {
      compositeScore,
      starRating: scoreToStars(compositeScore),
      returnScore,
      volatilityScore,
      drawdownScore,
      peerRankScore,
      weightProfile,
      period,
      weights,
      scales: scoreScales,
    };
  }

  /**
   * 计算并保存评分快照
   */
  async function calculateAndSaveScoreSnapshot(productId: number, snapshotDate: string, period: string): Promise<void> {
    const score = await calculateScore(productId, period);
    if (!score) return;

    // 先删除旧记录
    const query = strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot');
    await query.deleteMany({
      where: { product: productId, snapshotDate, period },
    });

    // 创建新记录
    await query.create({
      data: {
        product: productId,
        snapshotDate,
        period,
        compositeScore: score.compositeScore,
        starRating: score.starRating,
        returnScore: score.returnScore,
        volatilityScore: score.volatilityScore,
        drawdownScore: score.drawdownScore,
        peerRankScore: score.peerRankScore,
        weightProfile: score.weightProfile,
      },
    });
  }

  /**
   * 获取评分榜单
   */
  async function getScoreLeaderboard(params: {
    productType?: string;
    operationMode?: string;
    period?: string;
    riskLevel?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ records: any[]; total: number; page: number; pageSize: number }> {
    const {
      productType,
      operationMode,
      period = 'm1',
      riskLevel,
      page = 1,
      pageSize = 10,
    } = params;

    // 查询所有上架产品
    const productQuery = strapi.db.query('plugin::zhao-wealth.wealth-product');
    const where: any = { status: true };
    if (productType) where.productType = productType;
    if (operationMode) where.operationMode = operationMode;
    if (riskLevel) where.riskLevel = riskLevel;

    const limit = Math.min(pageSize, 50);
    const offset = (page - 1) * limit;

    const products = await productQuery.findMany({
      where,
      limit,
      offset,
      orderBy: { recommendWeight: 'desc' },
      populate: ['company'],
    });

    const total = await productQuery.count({ where });

    // 批量查询所有产品的评分
    const productIds = products.map((p: any) => p.id);
    const scoreQuery = strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot');
    const allScores = await scoreQuery.findMany({
      where: {
        product: { id: { $in: productIds } },
        period,
      },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 2,
    });

    // 内存中取每个产品最新的
    const scoreMap: Record<number, any> = {};
    for (const s of allScores) {
      const pid = s.product?.id || s.product;
      if (!scoreMap[pid]) {
        scoreMap[pid] = s;
      }
    }

    // 组装结果
    const records = products.map((product: any) => ({
      ...product,
      score: scoreMap[product.id] || null,
    }));

    // 按评分降序排序
    records.sort((a, b) => {
      const sa = a.score?.compositeScore ?? 0;
      const sb = b.score?.compositeScore ?? 0;
      return sb - sa;
    });

    return { records, total, page, pageSize: limit };
  }

  /**
   * 获取产品评分明细
   */
  async function getScoreBreakdown(productId: number, period: string): Promise<ScoreBreakdown | null> {
    const scoreQuery = strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot');
    const score = await scoreQuery.findOne({
      where: { product: productId, period },
      orderBy: { snapshotDate: 'desc' },
    });

    if (score) {
      const profile = score.weightProfile || 'bank-wealth';
      return {
        compositeScore: Number(score.compositeScore),
        starRating: score.starRating,
        returnScore: Number(score.returnScore),
        volatilityScore: Number(score.volatilityScore),
        drawdownScore: Number(score.drawdownScore),
        peerRankScore: Number(score.peerRankScore),
        weightProfile: score.weightProfile,
        period: score.period,
        weights: getWeights(profile),
        scales: scoreScales,
      };
    }

    // 无快照时实时计算
    return calculateScore(productId, period);
  }

  /**
   * 全量重算所有产品评分
   */
  async function recalculateAllScores(period: string = 'm1'): Promise<{ total: number; success: number; failed: number }> {
    const products = await strapi.db.query('plugin::zhao-wealth.wealth-product').findMany({
      where: { status: true },
      limit: 500,
    });

    const today = new Date().toISOString().split('T')[0];
    let success = 0;
    let failed = 0;

    for (const product of products) {
      try {
        await calculateAndSaveScoreSnapshot(product.id, today, period);
        success++;
      } catch (error) {
        strapi.log.error(`[zhao-wealth] 评分计算失败 productId=${product.id}: ${error.message}`);
        failed++;
      }
    }

    return { total: products.length, success, failed };
  }

  return {
    calculateScore,
    calculateAndSaveScoreSnapshot,
    getScoreLeaderboard,
    getScoreBreakdown,
    recalculateAllScores,
  };
};
