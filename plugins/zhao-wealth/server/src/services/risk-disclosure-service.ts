'use strict';

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 获取动态风险揭示
   */
  async getDynamicDisclosure(productId: number, period: string) {
    const product = await strapi.db.query('plugin::zhao-wealth.wealth-product').findOne({
      where: { id: productId },
    });

    if (!product) return null;

    const warnings: string[] = [];

    // 通用提示
    warnings.push('本平台提供的信息仅供参考，不构成投资建议。理财产品非存款，产品有风险，投资须谨慎。');

    // 周期相关提示
    if (period === 'm1') {
      warnings.push('短期收益不能代表长期趋势，近1月收益率仅供参考，请关注更长周期的收益表现。');
    } else if (period === 'm3') {
      warnings.push('近3月收益仅供参考，历史业绩不代表未来表现。');
    }

    // 产品类型相关提示
    if (product.productType === 'bank-wealth' && product.operationMode === 'daily-open') {
      warnings.push('日开理财回撤较小但收益空间有限，适合资金流动性管理，不适合追求较高回报。');
    } else if (product.productType === 'stock-fund' || product.productType === 'mixed-fund') {
      warnings.push('该类产品波动较大，净值可能出现较大幅度的涨跌，请确保风险承受能力匹配。');
    } else if (product.productType === 'money-fund') {
      warnings.push('货币基金收益较低但稳定性高，适合短期资金管理。');
    }

    // 高收益风险提示
    const snapshot = await strapi.db.query('plugin::zhao-wealth.wealth-annual-snapshot').findOne({
      where: { product: productId },
      orderBy: { snapshotDate: 'desc' },
    });

    if (snapshot) {
      const annualField = period === 'm1' ? 'annual1m' : period === 'm3' ? 'annual3m' : period === 'm6' ? 'annual6m' : 'annual1y';
      const annualReturn = snapshot[annualField] ? Number(snapshot[annualField]) : null;
      if (annualReturn !== null && !isNaN(annualReturn) && annualReturn > 0.08) {
        warnings.push(`该产品近期年化收益较高（${(annualReturn * 100).toFixed(2)}%），高收益伴随高风险，请关注波动率和回撤指标。`);
      }
    }

    // 评分相关提示
    const score = await strapi.db.query('plugin::zhao-wealth.wealth-score-snapshot').findOne({
      where: { product: productId, period },
      orderBy: { snapshotDate: 'desc' },
    });

    if (score) {
      if (score.starRating <= 2) {
        warnings.push('该产品综合评分较低，建议优先考虑同类评分更高的产品。');
      }
      warnings.push(`综合评分基于近${period === 'm1' ? '1月' : period === 'm3' ? '3月' : period === 'm6' ? '6月' : '1年'}收益、波动率、最大回撤加权计算（同类排名样本不足时不纳入），评分仅反映历史数据，不代表未来表现。`);
    }

    return {
      warnings,
      productType: product.productType,
      operationMode: product.operationMode,
    };
  },

  /**
   * 获取评分方法论说明
   */
  getScoreDisclaimer(productType: string, operationMode?: string): string {
    let text = '综合评分基于收益、波动率、最大回撤加权计算（同类排名样本不足时不纳入），仅反映历史数据。';

    if (productType === 'bank-wealth' && operationMode === 'daily-open') {
      text += '日开理财回撤天然接近0（权重10%），更侧重收益能力与波动控制。';
    } else if (productType === 'money-fund') {
      text += '货币基金不使用回撤指标，更侧重收益能力与波动控制。';
    }

    return text;
  },
});
