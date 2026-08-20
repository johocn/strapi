import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";

/** 从 payload 按路径取字段，支持 "a.b.c" 点路径 */
function pick(obj: any, path: string): any {
  if (!path) return undefined;
  return String(path)
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** 渲染 params：paramsTemplate {目标key: payload路径} */
function renderParams(template: any, payload: Record<string, any>) {
  const out: Record<string, any> = {};
  const map: Record<string, any> = template && typeof template === "object" ? template : {};
  for (const [k, p] of Object.entries(map)) {
    const v = pick(payload, String(p));
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** 渲染 link：替换 {key} 占位符 */
function renderLink(tpl: string | undefined, payload: Record<string, any>) {
  if (!tpl) return undefined;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (payload[k] !== undefined ? String(payload[k]) : ""));
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 身份桥接：按标识(mobile 优先/username/email)把业务用户(up_users)解析为 sso-user。
   * 匹配不到(未做微信绑定/标识不一)返回 null，调用方跳过触达并记日志。
   */
  async resolveSsoUserForUpUser(upUserId: number) {
    const up = await strapi.db.query("plugin::users-permissions.user").findOne({
      where: { id: upUserId },
      select: ["id", "username", "email"],
    });
    if (!up) return null;
    const or: any[] = [];
    if (up.username) or.push({ username: up.username });
    if (up.email) or.push({ email: String(up.email).toLowerCase() });
    if (up.mobile) or.push({ mobile: up.mobile });
    if (or.length === 0) return null;
    return strapi.db.query(SSO_USER_UID).findOne({ where: { $or: or } });
  },

  /** 事件触发：业务埋点统一入口。
   * - 有 schedules：按业务精确排期逐条建任务（覆盖规则默认延迟）。
   * - 无 schedules：按匹配事件且启用的规则生成任务（delayMinutes 相对延迟）。
   */
  async trigger(event: string, opts: {
    user: number;
    payload?: Record<string, any>;
    schedules?: Array<{
      templateCode: string;
      scene?: string;
      scheduledAt?: string;
      delayMinutes?: number;
      params?: Record<string, any>;
      link?: string;
      dedupeKey?: string;
    }>;
  }) {
    const { user, payload = {}, schedules } = opts || {};
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const results: any[] = [];

    let jobs = schedules || [];
    if (!schedules || schedules.length === 0) {
      const rules = await strapi.db.query(SOP_RULE_UID).findMany({
        where: { source: "event", event, enabled: true },
      });
      jobs = rules.map((r: any) => ({
        templateCode: r.template_code,
        scene: r.scene,
        params: renderParams(r.params_template, payload),
        link: renderLink(r.link, payload),
        delayMinutes: r.delay_minutes || 0,
        dedupeKey: `sop:${r.code}:${user}`,
      }));
    }

    for (const j of jobs) {
      const base: any = {
        user,
        scene: j.scene || event,
        templateCode: j.templateCode,
        params: j.params || {},
        link: j.link,
        dedupeKey: j.dedupeKey,
      };
      if (j.scheduledAt) {
        base.scheduledAt = j.scheduledAt;
      } else if (j.delayMinutes) {
        base.scheduledAt = new Date(Date.now() + j.delayMinutes * 60000).toISOString();
      }
      try {
        results.push(await msg.buildJob(base));
      } catch (e: any) {
        strapi.log.warn(`[sso-sop] buildJob failed (${event}): ${e.message}`);
        results.push({ skipped: true, error: e.message });
      }
    }
    return results;
  },

  /** cron 调度：扫描到期 pending 任务并发送，返回已发送条数 */
  async runDueJobs(limit = 50) {
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    let jobs: any[] = [];
    try {
      jobs = await msg.listPendingJobsForSend(limit, true);
    } catch (e: any) {
      strapi.log.warn(`[sso-sop] listPendingJobsForSend failed: ${e.message}`);
      return 0;
    }
    let sent = 0;
    for (const j of jobs) {
      try {
        await msg.sendJob(j.id);
        sent++;
      } catch (e: any) {
        strapi.log.warn(`[sso-sop] sendJob(${j.id}) failed: ${e.message}`);
      }
    }
    return sent;
  },
});