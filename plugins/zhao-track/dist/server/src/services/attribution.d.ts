import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findMatchingClick: (order: any) => Promise<{
        click: any;
        quality: string;
        sourceTagId?: string;
    } | null>;
    /**
     * 执行归因：扫描所有 matchedClick 为空的订单，逐条匹配并写入
     * 幂等：仅处理 matchedClick: null 的订单
     */
    run(opts?: {
        limit?: number;
    }): Promise<{
        total: number;
        matched: number;
        unmatched: number;
        byQuality: {
            pid_match: number;
            click_match: number;
            weak_match: number;
            fallback_match: number;
        };
    }>;
};
export default _default;
