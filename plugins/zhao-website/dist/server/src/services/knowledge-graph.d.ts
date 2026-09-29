import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findEntities(siteId: number, query?: any): Promise<any[]>;
    /** 站点绝对 URL：优先入参（可为绝对 URL 或裸 Host，裸值补 https），否则取 site-config.domain；都缺失返回空串 */
    _resolveSiteUrl(siteId: number, siteUrl?: string): Promise<string>;
    findEntityBySlug(siteId: number, slug: string): Promise<any>;
    findEntityByRef(params: {
        refTargetType: string;
        refTargetId: string;
    }): Promise<any>;
    upsertEntityFromContent(params: {
        siteId: number;
        entityType: string;
        name: string;
        slug?: string;
        refTargetType: string;
        refTargetId: string;
    }): Promise<any>;
    createEntity(siteId: number | null, data: any, actor?: any): Promise<any>;
    updateEntity(siteId: number | null, documentId: string, data: any, actor?: any): Promise<any>;
    deleteEntity(siteId: number | null, documentId: string, actor?: any): Promise<any>;
    submitEntity(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    approveEntity(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    rejectEntity(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    findRelations(siteId: number, query?: any): Promise<any[]>;
    /** documentId/数字 id → 实体数字 id（关系过滤必须用数字 id） */
    _resolveEntityId(ref: string | number): Promise<number | null>;
    /**
     * 统一归一入口：lnk 列只接受数字 id，解析失败直接 400。
     * 所有指向 subjectEntity/objectEntity/canonicalEntity 的过滤与写入都必须走这里。
     */
    _requireEntityId(ref: string | number, label?: string): Promise<number>;
    /** documentId/数字 id → 真值数字 id */
    _resolveTruthId(ref: string | number): Promise<number | null>;
    /** 归一入口：truthPolicy 也是 lnk 列，只接受数字 id，解析失败 400 */
    _requireTruthId(ref: string | number, label?: string): Promise<number>;
    /**
     * 关系值 vs 真值 canonicalValue 一致性校验 + 反向证据链落点。
     * - 无绑定 / 真值停用或软删 / 客体为 objectEntity 指针 → 跳过，返回 null（不写标记）
     * - 命中 → relation.verificationStatus = verified；不一致 → conflict
     */
    compareRelationWithTruth(relation: any): Promise<"verified" | "conflict" | null>;
    /** 比对失败不阻塞写入，只告警 */
    _safeCompareWithTruth(relation: any): Promise<"verified" | "conflict">;
    addRelation(params: {
        siteId: number;
        subjectEntityId: string;
        predicate: string;
        objectEntityId?: string;
        objectValue?: any;
        objectText?: string;
        evidenceText?: string;
        sourceType?: string;
        truthPolicyId?: string;
        actor?: any;
    }): Promise<any>;
    _detectCycle(subjectId: string, objectId: string, predicate: string, visited?: Set<string>): Promise<boolean>;
    deleteRelation(siteId: number, documentId: string, actor?: any): Promise<any>;
    submitRelation(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    approveRelation(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    rejectRelation(siteId: number | null, documentId: string, actor?: any, reason?: string): Promise<any>;
    updateRelation(siteId: number, documentId: string, data: any, actor?: any): Promise<any>;
    disambiguate(siteId: number, params: {
        name: string;
        entityType?: string;
    }): Promise<any | null>;
    syncFromContent(targetType: string, content: any): Promise<void>;
    verifyAll(siteId: number): Promise<{
        total: number;
        conflicts: number;
        report: any[];
    }>;
    /** 关系是否违反客体契约（读时隔离用；未登记契约或未知主体类型 → 不违规） */
    _isContractViolation(subjectEntityType: string | undefined, relation: any): boolean;
    /** cites 关系按 truthPolicy 去重，仅保留最新（updatedAt 最大）一条；其余关系原样保留 */
    _dedupeCitations(relations: any[]): any[];
    exportGraph(siteId: number, siteUrl?: string): Promise<any>;
    exportEntity(siteId: number, slug: string, siteUrl?: string): Promise<any | null>;
    /** 实体 → 提及该实体的已发布 GEO 文章（entityId 为实体数字 id） */
    findArticlesByEntity(siteId: number, entityId: number, limit?: number): Promise<any[]>;
    _entityToJsonLd(entity: any, outgoing?: any[], incoming?: any[], siteUrl?: string): any;
    exportFacts(siteId: number): Promise<any[]>;
};
export default _default;
