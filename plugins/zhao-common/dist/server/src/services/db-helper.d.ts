import { Core } from '@strapi/strapi';
/**
 * Strapi v5 数据访问辅助层
 *
 * 解决三个核心问题：
 * 1. strapi.documents 默认返回 draft，draftAndPublish=true 的 content type 需传 status:'published'
 * 2. strapi.db.query 返回 camelCase 字段名（documentId），非 snake_case（document_id）
 * 3. strapi.documents populate 关联 draftAndPublish=true 的 content type 时默认查 draft，关联为 null
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 判断 content type 是否启用了 draftAndPublish
     */
    isDraftAndPublish(uid: string): boolean;
    /**
     * 通过 Document Service 查询单条已发布记录
     * 自动处理 draftAndPublish=true 的 status:'published' 参数
     */
    findOne(uid: string, documentId: string, populate?: any): Promise<any>;
    /**
     * 通过 Document Service 查询多条已发布记录
     * 自动处理 draftAndPublish=true 的 status:'published' 参数
     */
    findMany(uid: string, options?: any): Promise<any[]>;
    /**
     * 通过 db.query 查询单条记录（绕过 draft/publish 机制）
     * 适用于：需要 populate draftAndPublish=true 关联、或需要 snake_case where 条件的场景
     */
    queryOne(uid: string, where: any, populate?: any): Promise<any>;
    /**
     * 通过 db.query 查询多条记录
     */
    queryMany(uid: string, where: any, populate?: any, opts?: {
        limit?: number;
        offset?: number;
        orderBy?: any;
    }): Promise<any[]>;
    /**
     * 从实体对象中提取 documentId（兼容 camelCase 和 snake_case）
     * strapi.db.query 返回 documentId，strapi.documents 也返回 documentId
     * 但有时旧代码或 join 表结果会返回 document_id
     */
    getDocumentId(entity: any): string | undefined;
    /**
     * 智能查询：自动判断用 Document Service 还是 db.query
     * - 需要 populate draftAndPublish=true 关联 → 用 db.query
     * - 其他场景 → 用 Document Service（自动加 status:'published'）
     */
    findSmart(uid: string, options: {
        documentId?: string;
        where?: any;
        populate?: any;
        useDbQuery?: boolean;
    }): Promise<any>;
};
export default _default;
