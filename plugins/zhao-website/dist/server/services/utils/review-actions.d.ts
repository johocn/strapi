import type { Core } from "@strapi/strapi";
type ReviewParams = {
    uid: string;
    targetType: "entity" | "relation" | "first-truth";
    siteId: number | null;
    documentId: string;
    action: "submit" | "approve" | "reject";
    actor?: {
        id?: number | string;
        label?: string;
    } | null;
    reason?: string | null;
    extraData?: Record<string, any>;
};
/**
 * 三表共用的审核动作：先更新状态（事实），再写严格流水（证据）。
 * 非原子（未封装事务），流水失败直接 500 让人核查，避免静默无记录。
 */
export declare function applyReview(strapi: Core.Strapi, params: ReviewParams): Promise<any>;
export {};
//# sourceMappingURL=review-actions.d.ts.map