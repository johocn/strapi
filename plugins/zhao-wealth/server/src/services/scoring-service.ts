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
   * 将原始值按同类产品百分位归一化到 0-100
   * ascending=false 表示值越大得分越高（如收益）
   * ascending=true 表示值越小得分越高（如波动率、回撤）
   */
  function percentileScore(value: number | null, allValues: (number | null)[], ascending: boolean): number {
    const validValues = allValues.filter((v): v is number => v !== null && !isNaN(v) && isFinite(v));
    if (validValues.length === 0 || value === null || isNaN(value) || !isFinite(value)) {
      return 50; // 无数据时给中间分
    }

    if (ascending) {
      // 值越小越好：比多少比例的产品小
      const below = validValues.filter(v => v < value).length;
      return Math.round((below / validValues.length) * 100);
    } else {
      // 值越大越好：比多少比例的产品大
      const above = validValues.filter(v => v > value).length;
      return Math.round((above / validValues.length) * 100);
    }
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
   * 查询同类产品在指定周期的所有指标值
   */
  async function getPeerMetrics(productType: string, operationMode: string | null, period: string, snapshotDate?: string): Promise<ProductWithMetrics[]> {
    const annualField = PERIOD_TO_ANNUAL_FIELD[period] || 'annual1m';
    const metricPeriod = PERIOD_TO_METRIC_PERIOD[period] || 'm1';

    // 查询所有同类产品
    const productQuery = strapi.db.query('plugin::zhao-wealth.wealth-product');
    const productWhere: any = { productType, status: true };
    if (operationMode) {
      productWhere.operationMode = operationMode;
    }

    const products = await productQuery.findMany({
      where: productWhere,
      limit: 500,
    });

    if (!products || products.length === 0) return [];

    const productIds = products.map((p: any) => p.id);

    // 批量查询所有产品的年化快照（按 product id IN [...] 查询）
    const snapshotQuery = strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot');
    const allSnapshots = await snapshotQuery.findMany({
      where: { product: { id: { $in: productIds } } },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 4, // 每个产品最多4条记录
    });

    // 内存中取每个产品最新的
    const latestSnapshots: Record<number, any> = {};
    for (const s of allSnapshots) {
      const pid = s.product?.id || s.product;
      if (!latestSnapshots[pid]) {
        latestSnapshots[pid] = s;
      }
    }

    // 批量查询所有产品的风险指标
    const metricQuery = strapi.db.query('plugin::zhao-wealth.wealth-risk-metric');
    const allMetrics = await metricQuery.findMany({
      where: {
        product: { id: { $in: productIds } },
        period: metricPeriod,
      },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 4,
    });

    // 内存中按产品分组取最新
    const metricMap: Record<number, Record<string, number | null>> = {};
    for (const m of allMetrics) {
      const pid = m.product?.id || m.product;
      if (!metricMap[pid]) metricMap[pid] = {};
      if (!metricMap[pid][m.metricName]) {
        metricMap[pid][m.metricName] = m.metricValue !== null ? Number(m.metricValue) : null;
      }
    }

    // 组装结果
    const result: ProductWithMetrics[] = productIds.map((pid: number) => {
      const snapshot = latestSnapshots[pid];
      const annualReturn = snapshot ? Number(snapshot[annualField]) : null;
      const productMetrics = metricMap[pid] || {};

      return {
        productId: pid,
        annualReturn: annualReturn !== null && !isNaN(annualReturn) ? annualReturn : null,
        volatility: productMetrics['volatility'] ?? null,
        maxDrawdown: productMetrics['maxDrawdown'] ?? null,
        rankPercentile: productMetrics['rankPercentile'] ?? null,
      };
    });

    return result;
  }

  /**
   * 计算单个产品的评分
   */
  async function calculateScore(productId: number, period: string): Promise<ScoreBreakdown | null> {
    // 1. 获取产品信息
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });
    if (!product) return null;

    const weightProfile = getWeightProfile(product.productType, product.operationMode);
    const weights = getWeights(weightProfile);

    // 2. 获取同类产品的指标
    const peerMetrics = await getPeerMetrics(product.productType, product.operationMode, period);
    if (peerMetrics.length === 0) return null;

    const currentProduct = peerMetrics.find(p => p.productId === productId);
    if (!currentProduct) return null;

    // 3. 各维度归一化
    const allReturns = peerMetrics.map(p => p.annualReturn);
    const allVolatilities = peerMetrics.map(p => p.volatility);
    const allDrawdowns = peerMetrics.map(p => p.maxDrawdown);
    const allRanks = peerMetrics.map(p => p.rankPercentile);

    const returnScore = percentileScore(currentProduct.annualReturn, allReturns, false);
    const volatilityScore = percentileScore(currentProduct.volatility, allVolatilities, true);
    const drawdownScore = percentileScore(currentProduct.maxDrawdown, allDrawdowns, true);
    const peerRankScore = currentProduct.rankPercentile !== null
      ? Math.round(Number(currentProduct.rankPercentile))
      : 50;

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
      return {
        compositeScore: Number(score.compositeScore),
        starRating: score.starRating,
        returnScore: Number(score.returnScore),
        volatilityScore: Number(score.volatilityScore),
        drawdownScore: Number(score.drawdownScore),
        peerRankScore: Number(score.peerRankScore),
        weightProfile: score.weightProfile,
        period: score.period,
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
