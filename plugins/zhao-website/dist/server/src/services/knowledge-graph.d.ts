import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findEntities(siteId: number, query?: any): Promise<any[]>;
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
    createEntity(siteId: number | null, data: any): Promise<any>;
    updateEntity(siteId: number | null, documentId: string, data: any): Promise<any>;
    deleteEntity(siteId: number | null, documentId: string): Promise<any>;
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
        sourceType?: string;
        truthPolicyId?: string;
    }): Promise<any>;
    _detectCycle(subjectId: string, objectId: string, predicate: string, visited?: Set<string>): Promise<boolean>;
    deleteRelation(siteId: number, documentId: string): Promise<any>;
    updateRelation(siteId: number, documentId: string, data: any): Promise<any>;
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
    exportGraph(siteId: number): Promise<any>;
    exportEntity(siteId: number, slug: string): Promise<any | null>;
    /** 实体 → 提及该实体的已发布 GEO 文章（entityId 为实体数字 id） */
    findArticlesByEntity(siteId: number, entityId: number, limit?: number): Promise<any[]>;
    _entityToJsonLd(entity: any, outgoing?: any[], incoming?: any[]): any;
    exportFacts(siteId: number): Promise<any[]>;
};
export default _default;
