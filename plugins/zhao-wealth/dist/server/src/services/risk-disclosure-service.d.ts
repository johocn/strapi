import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取动态风险揭示
     */
    getDynamicDisclosure(productId: number, period: string): Promise<{
        warnings: string[];
        productType: any;
        operationMode: any;
    }>;
    /**
     * 获取评分方法论说明
     */
    getScoreDisclaimer(productType: string, operationMode?: string): string;
};
export default _default;
