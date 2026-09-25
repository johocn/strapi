/**
 * 到场核销票据的纯逻辑（不依赖 strapi，便于单测）。
 * 票据 token 由服务端随机生成并落库，客户端只负责展示 `atk:{token}`；
 * 扫码端把原始文本交回后端，由本模块解析与校验。
 */
import crypto from "crypto";

/** 票据有效期：5 分钟 */
export const TICKET_TTL_MS = 5 * 60 * 1000;

/** 二维码文本前缀 */
export const TICKET_PREFIX = "atk:";

/** 旧版明文码：activity:{活动ID}:{用户ID}（已停用，仅用于识别并给出明确文案） */
const LEGACY_RE = /^activity:[^:]+:[^:]+$/;

/** 生成票据 token：24 字节随机 hex（48 字符） */
export function newTicketToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export type ScanPayload =
  | { kind: "ticket"; token: string }
  | { kind: "legacy" }
  | { kind: "invalid" };

/** 解析扫码文本：只认 atk:{48位hex}；旧明文码单独识别 */
export function decodeScanText(text: unknown): ScanPayload {
  const s = typeof text === "string" ? text.trim() : "";
  if (!s) return { kind: "invalid" };
  if (s.startsWith(TICKET_PREFIX)) {
    const token = s.slice(TICKET_PREFIX.length).trim();
    return /^[0-9a-f]{48}$/.test(token) ? { kind: "ticket", token } : { kind: "invalid" };
  }
  if (LEGACY_RE.test(s)) return { kind: "legacy" };
  return { kind: "invalid" };
}

/**
 * 校验结果。插件 tsconfig 继承 Strapi 基线（`strict: false` → strictNullChecks 关闭），
 * 判别式联合在此配置下不会收窄，故用带可选字段的接口，避免消费者访问 code/message 报 TS2339。
 */
export interface TicketCheck {
  ok: boolean;
  code?: string;
  httpStatus?: number;
  message?: string;
}

const fail = (code: string, message: string, httpStatus = 400): TicketCheck => ({
  ok: false,
  code,
  httpStatus,
  message,
});

/**
 * 关系字段归一：number | "7" | { id: 7 } | null → number（无法解析返回 NaN）。
 * Strapi 的 db 层把 manyToOne 关系返回为对象（populate 与否都是对象），直接 Number() 会得 NaN，
 * 故必须先取 id 再转数字，否则跨活动比对会恒不相等。
 */
function relId(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "object") return Number((v as { id?: unknown }).id);
  return Number(v);
}

/**
 * 核销前校验：状态 → 时效 → 活动归属。
 * 全部通过才允许调用 checkin()，因此任何失败路径都不会发放签到积分。
 */
export function validateTicket(
  ticket: {
    status?: string | null;
    expiresAt?: string | Date | null;
    activity?: number | string | { id?: number | string } | null;
  } | null | undefined,
  opts: { activityId: number; now?: number },
): TicketCheck {
  const now = opts.now ?? Date.now();
  if (!ticket) return fail("invalid_token", "无效二维码");
  if (ticket.status === "used") return fail("ticket_used", "该二维码已被核销");
  if (ticket.status !== "pending") return fail("invalid_token", "无效二维码");
  const exp = ticket.expiresAt ? new Date(ticket.expiresAt).getTime() : NaN;
  if (!Number.isFinite(exp) || exp <= now) {
    return fail("ticket_expired", "二维码已过期，请让用户刷新后重新出示");
  }
  if (relId(ticket.activity) !== Number(opts.activityId)) {
    return fail("ticket_activity_mismatch", "二维码不属于本活动");
  }
  return { ok: true };
}

/** 手动核销理由校验：trim 后至少 2 个字符 */
export function validateManualReason(reason: unknown): TicketCheck {
  const s = typeof reason === "string" ? reason.trim() : "";
  if (s.length < 2) return fail("reason_required", "请填写手动核销理由");
  return { ok: true };
}

/** 已过期但仍 pending 的票据是否应转为 expired（惰性清理，不引 cron） */
export function shouldExpire(
  ticket: { status?: string | null; expiresAt?: string | Date | null } | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!ticket || ticket.status !== "pending") return false;
  const exp = ticket.expiresAt ? new Date(ticket.expiresAt).getTime() : NaN;
  return Number.isFinite(exp) && exp <= now;
}