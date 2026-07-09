import type { Core } from "@strapi/strapi";
import { Parser } from "expr-eval";

const RULE_UID = "plugin::zhao-logistics.quote-price-rule";
const FORMULA_UID = "plugin::zhao-logistics.quote-price-formula";
const REQUEST_UID = "plugin::zhao-logistics.quote-request";

/**
 * 报价计算结果
 */
export interface QuoteResult {
  ruleId: string;
  formulaId?: string;
  serviceProvider: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  breakdown: {
    base: number;
    volumetricWeight: number;
    surcharges: { name: string; amount: number }[];
    minCharge: number;
    formula?: string;
  };
  expiresAt: string;
}

/**
 * 报价输入
 */
export interface QuoteInput {
  routeId: string;
  serviceProvider?: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  variables?: Record<string, number>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 计算报价（单服务商）
   * 1. 匹配 quote-price-rule（routeId + serviceProvider + weight 区间）
   * 2. 若 rule.formula 存在，加载 quote-price-formula
   * 3. 解析 variables（从 input + rule 提取值）
   * 4. 沙箱执行 expression（用 expr-eval）
   * 5. 返回 QuoteResult
   */
  async calculate(siteId: number, input: QuoteInput): Promise<QuoteResult | null> {
    // 1. 匹配报价规则
    const rules = await strapi.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight },
        ...(input.serviceProvider ? { serviceProvider: input.serviceProvider } : {}),
      },
      populate: { formula: true },
      limit: 1,
      orderBy: { minWeight: "asc" },
    });

    if (!rules || rules.length === 0) return null;
    const rule = rules[0];

    // 2. 计算体积重量
    let volumetricWeight = 0;
    if (input.length && input.width && input.height && rule.volumetricFactor) {
      volumetricWeight = (input.length * input.width * input.height) / rule.volumetricFactor;
    }
    const chargeableWeight = Math.max(input.weight, volumetricWeight);

    // 3. 计算基础运费
    let basePrice = chargeableWeight * Number(rule.pricePerKg);

    // 4. 附加费
    const surcharges: { name: string; amount: number }[] = [];
    if (rule.surcharges && Array.isArray(rule.surcharges)) {
      for (const surcharge of rule.surcharges) {
        const amount = typeof surcharge.amount === "number"
          ? surcharge.amount
          : chargeableWeight * Number(surcharge.amount || 0);
        surcharges.push({ name: surcharge.name, amount });
        basePrice += amount;
      }
    }

    // 5. 公式覆盖（若 rule.formula 存在）
    let formulaExpression: string | undefined;
    let formulaId: string | undefined;
    if (rule.formula && rule.formula.expression) {
      formulaExpression = rule.formula.expression;
      formulaId = rule.formula.documentId;

      try {
        const parser = new Parser();
        const expr = parser.parse(formulaExpression);

        // 合并变量：input.variables + 自动变量
        const variables: Record<string, number> = {
          weight: chargeableWeight,
          base: basePrice,
          ...input.variables,
        };

        // 从 formula.variables JSON 提取默认值
        if (rule.formula.variables && typeof rule.formula.variables === "object") {
          for (const [key, val] of Object.entries(rule.formula.variables)) {
            if (typeof val === "number" && !(key in variables)) {
              variables[key] = val;
            }
          }
        }

        basePrice = expr.evaluate(variables);
      } catch (err) {
        strapi.log.error(`[quote-engine] 公式执行失败: ${formulaExpression}`, err);
        // 公式失败时回退到基础运费
      }
    }

    // 6. 最低运费
    const minCharge = rule.minCharge ? Number(rule.minCharge) : 0;
    if (basePrice < minCharge) {
      basePrice = minCharge;
    }

    // 7. 生成结果（minPrice = basePrice，maxPrice = basePrice * 1.1，留 10% 浮动空间）
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 小时后过期

    return {
      ruleId: rule.documentId,
      formulaId,
      serviceProvider: rule.serviceProvider,
      minPrice: Math.round(basePrice * 100) / 100,
      maxPrice: Math.round(basePrice * 1.1 * 100) / 100,
      currency: rule.currency || "CNY",
      breakdown: {
        base: Math.round(chargeableWeight * Number(rule.pricePerKg) * 100) / 100,
        volumetricWeight: Math.round(volumetricWeight * 100) / 100,
        surcharges,
        minCharge,
        formula: formulaExpression,
      },
      expiresAt: expiresAt.toISOString(),
    };
  },

  /**
   * 批量计算（多服务商比价）
   */
  async calculateMulti(siteId: number, input: QuoteInput): Promise<QuoteResult[]> {
    // 查询所有匹配的服务商
    const rules = await strapi.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight },
      },
      populate: { formula: true },
      orderBy: { serviceProvider: "asc" },
    });

    if (!rules || rules.length === 0) return [];

    // 按服务商分组，每组取最优规则
    const serviceProviderMap = new Map<string, any>();
    for (const rule of rules) {
      if (!serviceProviderMap.has(rule.serviceProvider)) {
        serviceProviderMap.set(rule.serviceProvider, rule);
      }
    }

    const results: QuoteResult[] = [];
    for (const provider of serviceProviderMap.values()) {
      const result = await this.calculate(siteId, {
        ...input,
        serviceProvider: provider.serviceProvider,
      });
      if (result) results.push(result);
    }

    return results.sort((a, b) => a.minPrice - b.minPrice);
  },

  /**
   * 保存报价到 quote-request
   */
  async saveQuote(siteId: number, quoteRequestId: string, result: QuoteResult): Promise<void> {
    await strapi.db.query(REQUEST_UID).update({
      where: { site: siteId, documentId: quoteRequestId },
      data: {
        quotedPrice: result.minPrice,
        quotedPriceMax: result.maxPrice,
        quotedCurrency: result.currency,
        quotedBreakdown: result.breakdown,
        quotedExpiresAt: result.expiresAt,
        status: "quoted",
      },
    });
  },
});
