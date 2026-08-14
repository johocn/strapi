'use strict';

import type { Core } from '@strapi/strapi';

interface PortfolioProduct {
  productId: number;
  productName: string;
  allocationRatio: number; // 0-1
  addedDate: string;
}

interface PlanPerformance {
  weightedReturn: number | null;
  weightedVolatility: number | null;
  weightedDrawdown: number | null;
  totalProducts: number;
  totalAmount: number | null;
  period: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const PERIOD_TO_ANNUAL_FIELD: Record<string, string> = {
    m1: 'annual1m',
    m3: 'annual3m',
    m6: 'annual6m',
    y1: 'annual1y',
  };

  /**
   * 创建组合方案
   */
  async function createPlan(userId: string, planData: {
    planName: string;
    planType?: string;
    products: PortfolioProduct[];
    totalAmount?: number;
  }) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const record = await query.create({
      data: {
        userId,
        planName: planData.planName,
        planType: planData.planType || 'custom',
        products: planData.products,
        totalAmount: planData.totalAmount || null,
        status: 'active',
      },
    });
    return record;
  }

  /**
   * 获取用户的组合方案列表
   */
  async function getPlans(userId: string, params: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = params;
    const limit = Math.min(pageSize, 100);
    const offset = (page - 1) * limit;

    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const records = await query.findMany({
      where: { userId, status: 'active' },
      limit,
      offset,
      orderBy: { updatedAt: 'desc' },
    });

    const total = await query.count({ where: { userId, status: 'active' } });

    return { records, total, page, pageSize: limit };
  }

  /**
   * 获取组合方案详情
   */
  async function getPlanDetail(planId: number) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const plan = await query.findOne({ where: { id: planId } });
    if (!plan) return null;

    // 解析 products JSON
    const products: PortfolioProduct[] = typeof plan.products === 'string'
      ? JSON.parse(plan.products)
      : plan.products || [];

    // 批量查询产品
    const productIds = products.map(p => p.productId);
    const productQuery = strapi.db.query('plugin::zhao-wealth.wealth-product');
    const productRecords = await productQuery.findMany({
      where: { id: { $in: productIds } },
      populate: ['company'],
      limit: productIds.length,
    });

    // 构建 id -> product 的映射
    const productMap: Record<number, any> = {};
    for (const p of productRecords) {
      productMap[p.id] = p;
    }

    // 组装结果
    const productDetails = products.map(item => {
      const product = productMap[item.productId];
      if (!product) return null;
      return {
        ...product,
        allocationRatio: item.allocationRatio,
        addedDate: item.addedDate,
      };
    }).filter(Boolean);

    return {
      ...plan,
      productDetails,
    };
  }

  /**
   * 更新组合方案
   */
  async function updatePlan(planId: number, planData: {
    planName?: string;
    planType?: string;
    products?: PortfolioProduct[];
    totalAmount?: number;
  }) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const data: any = {};
    if (planData.planName !== undefined) data.planName = planData.planName;
    if (planData.planType !== undefined) data.planType = planData.planType;
    if (planData.products !== undefined) data.products = planData.products;
    if (planData.totalAmount !== undefined) data.totalAmount = planData.totalAmount;

    const record = await query.update({ where: { id: planId }, data });
    return record;
  }

  /**
   * 删除组合方案（标记为 archived）
   */
  async function deletePlan(planId: number) {
    const query = strapi.db.query('plugin::zhao-wealth.wealth-portfolio-plan');
    const record = await query.update({
      where: { id: planId },
      data: { status: 'archived' },
    });
    return record;
  }

  /**
   * 计算组合方案业绩
   */
  async function calculatePlanPerformance(planId: number, period: string = 'm1'): Promise<PlanPerformance | null> {
    const plan = await getPlanDetail(planId);
    if (!plan || !plan.productDetails || plan.productDetails.length === 0) return null;

    const annualField = PERIOD_TO_ANNUAL_FIELD[period] || 'annual1m';
    const metricPeriod = period;

    // 批量查询年化快照
    const productIds = plan.productDetails.map((p: any) => p.id);
    const snapshotQuery = strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot');
    const allSnapshots = await snapshotQuery.findMany({
      where: { product: { id: { $in: productIds } } },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 2,
    });
    const snapshotMap: Record<number, any> = {};
    for (const s of allSnapshots) {
      const pid = s.product?.id || s.product;
      if (!snapshotMap[pid]) snapshotMap[pid] = s;
    }

    // 批量查询风险指标
    const metricQuery = strapi.db.query('plugin::zhao-wealth.wealth-risk-metric');
    const allMetrics = await metricQuery.findMany({
      where: { product: { id: { $in: productIds } }, period: metricPeriod },
      orderBy: { snapshotDate: 'desc' },
      limit: productIds.length * 4,
    });
    const metricMap: Record<number, Record<string, number | null>> = {};
    for (const m of allMetrics) {
      const pid = m.product?.id || m.product;
      if (!metricMap[pid]) metricMap[pid] = {};
      if (!metricMap[pid][m.metricName]) {
        const numValue = m.metricValue !== null ? Number(m.metricValue) : null;
        metricMap[pid][m.metricName] = (numValue !== null && !isNaN(numValue)) ? numValue : null;
      }
    }

    let totalWeight = 0;
    let weightedReturn = 0;
    let weightedVolatility = 0;
    let weightedDrawdown = 0;
    let hasReturn = false;
    let hasVolatility = false;
    let hasDrawdown = false;

    for (const product of plan.productDetails) {
      const ratio = Number(product.allocationRatio) || 0;
      if (ratio <= 0) continue;
      totalWeight += ratio;

      // 从内存中获取年化收益
      const snapshot = snapshotMap[product.id];
      if (snapshot && snapshot[annualField] !== null) {
        const annualReturn = Number(snapshot[annualField]);
        if (!isNaN(annualReturn)) {
          weightedReturn += annualReturn * ratio;
          hasReturn = true;
        }
      }

      // 从内存中获取风险指标
      const productMetrics = metricMap[product.id] || {};
      const volatility = productMetrics['volatility'];
      if (volatility !== null && volatility !== undefined) {
        weightedVolatility += volatility * ratio;
        hasVolatility = true;
      }

      const maxDrawdown = productMetrics['maxDrawdown'];
      if (maxDrawdown !== null && maxDrawdown !== undefined) {
        weightedDrawdown += maxDrawdown * ratio;
        hasDrawdown = true;
      }
    }

    // 归一化权重
    if (totalWeight > 0) {
      weightedReturn /= totalWeight;
      weightedVolatility /= totalWeight;
      weightedDrawdown /= totalWeight;
    }

    return {
      weightedReturn: hasReturn ? Math.round(weightedReturn * 10000) / 10000 : null,
      weightedVolatility: hasVolatility ? Math.round(weightedVolatility * 10000) / 10000 : null,
      weightedDrawdown: hasDrawdown ? Math.round(weightedDrawdown * 10000) / 10000 : null,
      totalProducts: plan.productDetails.length,
      totalAmount: plan.totalAmount ? Number(plan.totalAmount) : null,
      period,
    };
  }

  /**
   * 导出方案摘要数据
   */
  async function exportPlanSummary(planId: number) {
    const plan = await getPlanDetail(planId);
    if (!plan) return null;

    const performance = await calculatePlanPerformance(planId, 'm1');

    return {
      planName: plan.planName,
      planType: plan.planType,
      totalAmount: plan.totalAmount ? Number(plan.totalAmount) : null,
      products: plan.productDetails.map((p: any) => ({
        productName: p.productName,
        productType: p.productType,
        riskLevel: p.riskLevel,
        allocationRatio: p.allocationRatio,
        company: p.company?.shortName || p.company?.name || '',
      })),
      performance,
      exportDate: new Date().toISOString(),
      disclaimer: '本方案仅供参考，不构成投资建议。理财产品非存款，产品有风险，投资须谨慎。请前往银行网点或咨询理财顾问了解详细情况。',
    };
  }

  return {
    createPlan,
    getPlans,
    getPlanDetail,
    updatePlan,
    deletePlan,
    calculatePlanPerformance,
    exportPlanSummary,
  };
};
