import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const SSO_USER_UID = "plugin::zhao-sso.sso-user";
const MANUAL_TODO_UID = "plugin::zhao-sso.manual-sop-todo";

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
    const auth: any = strapi.plugin ? strapi.plugin("zhao-auth")?.service?.("auth") : null;
    const up = auth?.findUpUserById ? await auth.findUpUserById(upUserId, ["id", "username", "email"]) : null;
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

  /** 管理员接收手动 SOP 待办提醒的 sso-user 列表（来自插件配置，未配则跳过推送，保留后台待办列表）。 */
  adminNotifyUsers(): number[] {
    try {
      const cfg = (strapi.config.get("plugin::zhao-sso") as any)?.manualSop || {};
      const v = cfg.adminNotifyUsers;
      return Array.isArray(v) ? v.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)) : [];
    } catch {
      return [];
    }
  },

  /**
   * 事件埋点：为「手动 SOP」环节生成一条待办 + 微信提醒管理员。
   * 不在此刻发送任何 C 端消息；真正的发送在 dispatchManualTodo（管理员点发）时发生。
   */
  async enqueueManualSop(entry: {
    code: string;
    title: string;
    scene: string;
    templateCode?: string;
    link?: string;
    audience: Record<string, any>;
    paramsTemplate?: Record<string, any>;
    description?: string;
  }) {
    const doc = await strapi.db.query(MANUAL_TODO_UID).create({
      data: {
        code: entry.code,
        title: entry.title,
        scene: entry.scene,
        templateCode: entry.templateCode || null,
        link: entry.link || null,
        audience: entry.audience || {},
        paramsTemplate: entry.paramsTemplate || {},
        status: "open",
        description: entry.description || null,
      },
    });
    const notified = await this.notifyAdmins({ todoId: doc.id, scene: entry.scene, title: entry.title });
    return { todo: doc, notified };
  },

  /** 微信模板推送给管理员（sso-user），未配置名单则跳过（仅留后台待办列表）。 */
  async notifyAdmins({ todoId, scene, title }: { todoId: number; scene: string; title: string }) {
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const admins = this.adminNotifyUsers();
    let notified = 0;
    for (const adminSsoUserId of admins) {
      try {
        await msg.buildJob({
          user: adminSsoUserId,
          scene: "admin.sop",
          templateCode: "admin_notify",
          params: { todoTitle: title, todoId },
          link: `/admin/sso/sop-manual-todo/list`,
          dedupeKey: `sopManualNotify:${todoId}:${adminSsoUserId}`,
        });
        notified++;
      } catch (e: any) {
        strapi.log.warn(`[sso-sop] notifyAdmins failed (admin=${adminSsoUserId}): ${e.message}`);
      }
    }
    return notified;
  },

  /**
   * 管理员点发：按待办 audience 实时查目标 up_user 名单，逐条建 job。
   * audience 形态由调用方(zhao-point)按需约定；此处以通用「query object」委托给回调解释。
   */
  async dispatchManualTodo(todoId: number, resolveTargetUsers: (audience: any) => Promise<number[]>) {
    const todo = await strapi.db.query(MANUAL_TODO_UID).findOne({ where: { id: Number(todoId) } });
    if (!todo) throw new Error("待办不存在");
    if (todo.status !== "open") return { sent: 0, skipped: 1, reason: `status=${todo.status}` };
    const msg = strapi.plugin("zhao-sso").service("sso-msg");
    const upUserIds = await resolveTargetUsers(todo.audience || {});
    let sent = 0;
    let skipped = 0;
    for (const upUserId of upUserIds) {
      const sso = await this.resolveSsoUserForUpUser(upUserId);
      if (!sso) { skipped++; continue; }
      try {
        await msg.buildJob({
          user: sso.id,
          scene: todo.scene,
          templateCode: todo.templateCode,
          params: todo.paramsTemplate || {},
          link: todo.link || undefined,
          dedupeKey: `sopManual:${todo.id}:${sso.id}`,
        });
        sent++;
      } catch (e: any) {
        skipped++;
        strapi.log.warn(`[sso-sop] dispatchManualTodo buildJob failed (user=${upUserId}): ${e.message}`);
      }
    }
    await strapi.db.query(MANUAL_TODO_UID).update({
      where: { id: todo.id },
      data: { status: "done", doneAt: new Date().toISOString(), sentCount: sent },
    });
    return { sent, skipped };
  },
});