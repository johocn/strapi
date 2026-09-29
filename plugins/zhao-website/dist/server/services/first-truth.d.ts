import type { Core } from "@strapi/strapi";
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number | null, query?: any): Promise<any[]>;
    findOne(siteId: number | null, documentId: string): Promise<any>;
    findByClaimKey(siteId: number | null, claimKey: string): Promise<any>;
    create(siteId: number | null, data: any, actor?: any): Promise<any>;
    update(siteId: number | null, documentId: string, data: any, actor?: any): Promise<any>;
    /** 真值变更 → 重比绑定到它的关系（单条失败不阻塞） */
    _revalidateEvidenceRelations(truthId: number): Promise<void>;
    _markRelatedEntitiesPending(siteId: number | null, canonicalEntity: any): Promise<void>;
    /** 兼容旧契约：verify = approve 的别名 */
    verify(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    submit(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    approve(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    reject(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    softDelete(siteId: number | null, documentId: string, actor?: any): Promise<any>;
    detectConflicts(siteId: number | null): Promise<any[]>;
};
export default _default;
//# sourceMappingURL=first-truth.d.ts.map