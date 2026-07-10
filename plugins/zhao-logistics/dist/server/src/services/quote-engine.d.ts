import { Core } from '@strapi/strapi';
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
        surcharges: {
            name: string;
            amount: number;
        }[];
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
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 计算报价（单服务商）
     * 1. 匹配 quote-price-rule（routeId + serviceProvider + weight 区间）
     * 2. 若 rule.formula 存在，加载 quote-price-formula
     * 3. 解析 variables（从 input + rule 提取值）
     * 4. 沙箱执行 expression（用 expr-eval）
     * 5. 返回 QuoteResult
     */
    calculate(siteId: number, input: QuoteInput): Promise<QuoteResult | null>;
    /**
     * 批量计算（多服务商比价）
     */
    calculateMulti(siteId: number, input: QuoteInput): Promise<QuoteResult[]>;
    /**
     * 保存报价到 quote-request
     */
    saveQuote(siteId: number, quoteRequestId: string, result: QuoteResult): Promise<void>;
};
export default _default;
