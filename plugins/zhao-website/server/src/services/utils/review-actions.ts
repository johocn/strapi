import type { Core } from "@strapi/strapi";
import { diffFields } from "./stable-json";

/** 审核动作 → 目标状态 */
const STATUS_BY_ACTION: Record<string, string> = {
  submit: "pending",
  approve: "verified",
  reject: "rejected",
};

type ReviewParams = {
  uid: string;
  targetType: "entity" | "relation" | "first-truth";
  siteId: number | null;
  documentId: string;
  action: "submit" | "approve" | "reject";
  actor?: { id?: number | string; label?: string } | null;
  reason?: string | null;
  extraData?: Record<string, any>;
};

/**
 * 三表共用的审核动作：先更新状态（事实），再写严格流水（证据）。
 * 非原子（未封装事务），流水失败直接 500 让人核查，避免静默无记录。
 */
export async function applyReview(strapi: Core.Strapi, params: ReviewParams) {
  const { uid, targetType, siteId, documentId, action, actor, reason, extraData } = params;

  if (action === "reject" && !String(reason ?? "").trim()) {
    const e: any = new Error("驳回必须填写理由");
    e.status = 400;
    e.code = "REASON_REQUIRED";
    throw e;
  }

  const existing: any = await strapi.db.query(uid).findOne({
    where: { site: siteId, documentId, deletedAt: null },
  });
  if (!existing) {
    const e: any = new Error("Record not found");
    e.status = 404;
    e.code = "NOT_FOUND";
    throw e;
  }

  const status = STATUS_BY_ACTION[action];
  const version = (Number(existing.version) || 1) + 1;
  const data: any = { verificationStatus: status, version, ...(extraData || {}) };
  if (action === "approve") data.lastVerifiedAt = new Date().toISOString();

  const updated = await strapi.db.query(uid).update({ where: { id: existing.id }, data });

  const audit: any = strapi.plugin("zhao-website").service("knowledge-audit");
  await audit.append({
    siteId,
    targetType,
    targetId: documentId,
    action,
    actor,
    reason: reason ?? null,
    version,
    strict: true,
    changedFields: diffFields(
      { verificationStatus: existing.verificationStatus },
      { verificationStatus: status }
    ),
  });

  return updated;
}