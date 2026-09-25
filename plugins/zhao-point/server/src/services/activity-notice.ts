/** 改期/取消群发通知纯逻辑：状态变化判定 + 收件人集合。
 *  activity.status 真实枚举为 draft/signup_open/ongoing/ended/archived（无 cancelled），
 *  取消判定以「published_at 置空（下架）」与「status 流转为终态（ended/archived）」为准。 */

export type ChangeKind = "rescheduled" | "cancelled" | "none";

export interface StatusChange {
  kind: ChangeKind;
  changedFields: string[];
}

/** 视为活动终止（对已报名用户等同取消）的 status 枚举值 */
export const TERMINAL_STATUSES = ["ended", "archived"] as const;

/** 归一时间为毫秒时间戳（空值/非法→null），避免字符串字面量差异误判 */
function normTime(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 管理端编辑前后对比：时间变化→rescheduled；下架或流转终态→cancelled（取消优先）。新活动（无旧值）→none。 */
export function detectStatusChange(oldAct: any, newAct: any): StatusChange {
  if (!oldAct || !newAct) return { kind: "none", changedFields: [] };
  const changedFields: string[] = [];
  if (normTime(oldAct.startTime) !== normTime(newAct.startTime)) changedFields.push("startTime");
  if (normTime(oldAct.endTime) !== normTime(newAct.endTime)) changedFields.push("endTime");
  const unpublished = !!oldAct.publishedAt && !newAct.publishedAt;
  const oldStatus = oldAct.status ?? null;
  const newStatus = newAct.status ?? null;
  const toTerminal = oldStatus !== newStatus && (TERMINAL_STATUSES as readonly string[]).includes(newStatus);
  if (unpublished) changedFields.push("publishedAt");
  if (toTerminal) changedFields.push("status");
  const kind: ChangeKind = unpublished || toTerminal ? "cancelled" : changedFields.length > 0 ? "rescheduled" : "none";
  return { kind, changedFields };
}

/** 收件人 = active+waiting 报名用户去重集合（兼容 user 对象与裸 id，过滤非法/缺失 id） */
export function audienceFor(signups: any[]): number[] {
  const ids = new Set<number>();
  for (const s of Array.isArray(signups) ? signups : []) {
    if (s?.status !== "active" && s?.status !== "waiting") continue;
    const id = s.user?.id ?? s.user;
    if (Number.isFinite(id)) ids.add(id);
  }
  return [...ids];
}
