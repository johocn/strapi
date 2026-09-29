import type { Core } from "@strapi/strapi";

const AUDIT_UID = "plugin::zhao-website.knowledge-audit-log";

/** 审计写入参数：strict=true 时写失败直接抛错（审核动作用），否则只 warn */
type AuditParams = {
  siteId?: number | null;
  targetType: "entity" | "relation" | "first-truth";
  targetId: string;
  action: "create" | "update" | "delete" | "submit" | "approve" | "reject" | "recheck";
  actor?: { id?: number | string; label?: string } | null;
  actorLabel?: string | null;
  changedFields?: any;
  reason?: string | null;
  version?: number | null;
  strict?: boolean;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 追加一条流水；append-only，不提供任何修改/删除 */
  async append(params: AuditParams) {
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
    } catch (err: any) {
      const msg = `[kg-audit] 写入流水失败: ${err?.message}`;
      if (params.strict) {
        const e: any = new Error(msg);
        e.status = 500;
        e.code = "AUDIT_WRITE_FAILED";
        throw e;
      }
      strapi.log.warn(msg);
      return null;
    }
  },

  /** 按被操作对象查流水：租户流水 + 全局流水，按时间倒序 */
  async findByTarget(
    siteId: number | null,
    targetType: string,
    targetId: string,
    { page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}
  ) {
    const where: any = {
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
export async function auditSafe(strapi: Core.Strapi, params: AuditParams): Promise<void> {
  try {
    const svc: any = strapi.plugin("zhao-website").service("knowledge-audit");
    await svc.append({ ...params, strict: false });
  } catch (err: any) {
    strapi.log.warn(`[kg-audit] 写入流水失败: ${err?.message}`);
  }
}