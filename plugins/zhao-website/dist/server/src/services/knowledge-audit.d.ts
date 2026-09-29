import { Core } from '@strapi/strapi';
/** 审计写入参数：strict=true 时写失败直接抛错（审核动作用），否则只 warn */
type AuditParams = {
    siteId?: number | null;
    targetType: "entity" | "relation" | "first-truth";
    targetId: string;
    action: "create" | "update" | "delete" | "submit" | "approve" | "reject" | "recheck";
    actor?: {
        id?: number | string;
        label?: string;
    } | null;
    actorLabel?: string | null;
    changedFields?: any;
    reason?: string | null;
    version?: number | null;
    strict?: boolean;
};
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 追加一条流水；append-only，不提供任何修改/删除 */
    append(params: AuditParams): Promise<any>;
    /** 按被操作对象查流水：租户流水 + 全局流水，按时间倒序 */
    findByTarget(siteId: number | null, targetType: string, targetId: string, { page, pageSize }?: {
        page?: number;
        pageSize?: number;
    }): Promise<{
        results: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
        };
    }>;
};
export default _default;
/** 非审核路径的审计写入：失败只 warn，绝不阻塞业务 */
export declare function auditSafe(strapi: Core.Strapi, params: AuditParams): Promise<void>;
