"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditSafe = auditSafe;
const AUDIT_UID = "plugin::zhao-website.knowledge-audit-log";
exports.default = ({ strapi }) => ({
    /** 追加一条流水；append-only，不提供任何修改/删除 */
    async append(params) {
        const { actor } = params;
        const data = {
            site: params.siteId ?? null,
            targetType: params.targetType,
            targetId: params.targetId,
            action: params.action,
            actorId: actor?.id != null ? String(actor.id) : null,
            // actorLabel 是快照：用户改名/删除后历史仍可举证
            actorLabel: params.actorLabel ?? actor?.label ?? null,
            changedFields: params.changedFields ?? null,
            reason: params.reason ?? null,
            version: params.version ?? null,
        };
        try {
            return await strapi.db.query(AUDIT_UID).create({ data });
        }
        catch (err) {
            const msg = `[kg-audit] 写入流水失败: ${err?.message}`;
            if (params.strict) {
                const e = new Error(msg);
                e.status = 500;
                e.code = "AUDIT_WRITE_FAILED";
                throw e;
            }
            strapi.log.warn(msg);
            return null;
        }
    },
    /** 按被操作对象查流水：租户流水 + 全局流水，按时间倒序 */
    async findByTarget(siteId, targetType, targetId, { page = 1, pageSize = 20 } = {}) {
        const where = {
            targetType,
            targetId,
            deletedAt: null,
            $or: [{ site: siteId }, { site: null }],
        };
        const [results, total] = await Promise.all([
            strapi.db.query(AUDIT_UID).findMany({
                where,
                orderBy: { createdAt: "DESC" },
                limit: Number(pageSize),
                offset: (Number(page) - 1) * Number(pageSize),
            }),
            strapi.db.query(AUDIT_UID).count({ where }),
        ]);
        return { results, pagination: { page: Number(page), pageSize: Number(pageSize), total } };
    },
});
/** 非审核路径的审计写入：失败只 warn，绝不阻塞业务 */
async function auditSafe(strapi, params) {
    try {
        const svc = strapi.plugin("zhao-website").service("knowledge-audit");
        await svc.append({ ...params, strict: false });
    }
    catch (err) {
        strapi.log.warn(`[kg-audit] 写入流水失败: ${err?.message}`);
    }
}
//# sourceMappingURL=knowledge-audit.js.map