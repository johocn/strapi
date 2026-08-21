import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
const REPURCHASE_SIGNS_UID = "plugin::zhao-point.activity-signup";
const DATE_MS = 86400000;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getSopStats(opts: { from?: string; to?: string; scene?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    const range = { createdAt: { $gte: from, $lte: to } };

    const rules = await strapi.db.query(SOP_RULE_UID).findMany({});
    const ruleByScene = new Map<string, any[]>();
    for (const r of rules) {
      if (!ruleByScene.has(r.scene)) ruleByScene.set(r.scene, []);
      ruleByScene.get(r.scene)!.push(r);
    }

    const sceneSet = new Set<string>([...ruleByScene.keys()]);
    if (opts.scene) {
      sceneSet.add(opts.scene);
    } else {
      // 无 scene 筛选时，补齐仅存在 job 的 scene（无对应 sop-rule 的独立场景也要进漏斗）
      const jobScenes = await strapi.db.query(MSG_JOB_UID).findMany({ select: ["scene"] });
      for (const s of jobScenes) sceneSet.add(s.scene);
    }
    const scenes = Array.from(sceneSet).filter((s) => (opts.scene ? s === opts.scene : true));

    const countBy = (scene: string, status?: string) =>
      status
        ? strapi.db.query(MSG_JOB_UID).count({ where: { scene, status, ...range } })
        : strapi.db.query(MSG_JOB_UID).count({ where: { scene, ...range } });

    const rows: any[] = [];
    const summary = { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, pending: 0, sentRate: 0 };

    for (const s of scenes) {
      const [total, sent, failed, quota, pending, cancelled] = await Promise.all([
        countBy(s), countBy(s, "sent"), countBy(s, "failed"), countBy(s, "quota_limited"), countBy(s, "pending"), countBy(s, "cancelled"),
      ]);

      let clicks = 0;
      const ruleList = ruleByScene.get(s) || [];
      for (const r of ruleList) {
        if (!r.templateCode) continue;
        const tpl = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { code: r.templateCode } });
        if (!tpl) continue;
        const vers = await strapi.db.query(MSG_VERSION_UID).findMany({ where: { template: tpl.id } });
        for (const v of vers) clicks += v.clickCount || 0;
      }

      const sentRate = total ? Math.round((sent / total) * 100) : 0;
      rows.push({
        scene: s,
        rules: ruleList.map((r) => ({ code: r.code, name: r.name ?? null, templateCode: r.templateCode ?? null, source: r.source ?? null })),
        total, sent, failed, quotaLimited: quota, pending, cancelled, sentRate, clicks,
      });
      summary.sceneCount += 1;
      summary.total += total; summary.sent += sent; summary.failed += failed;
      summary.quotaLimited += quota; summary.pending += pending;
    }
    summary.sentRate = summary.total ? Math.round((summary.sent / summary.total) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), summary, rows };
  },

  async getRepurchaseStats(opts: { from?: string; to?: string }) {
    const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
    const to = opts.to ? new Date(opts.to) : new Date();
    if (from.getTime() > to.getTime()) {
      const err: any = new Error("from 不能晚于 to");
      err.status = 400;
      throw err;
    }
    // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
    const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
    const windowDays = Number(rule?.conversionWindowDays ?? 7) || 7;
    const windowMs = windowDays * DATE_MS;

    // 区间内送达的复购触达 job
    const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
      where: { scene: "activity.repurchase", status: "sent", sentAt: { $gte: from, $lte: to } },
    });

    const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
    const convertedUserSet = new Set<number>();
    let conversions = 0;

    for (const j of jobs) {
      const up = await ssoSvc.resolveUpUserForSsoUser(j.user);
      if (!up) continue;
      const userId = up.id;
      const from2 = new Date(j.sentAt);
      const to2 = new Date(from2.getTime() + windowMs);
      const cnt = await strapi.db.query(REPURCHASE_SIGNS_UID).count({
        where: { user: userId, status: "active", signupAt: { $gt: from2, $lte: to2 } },
      });
      if (cnt > 0) {
        conversions += cnt;
        convertedUserSet.add(userId);
      }
    }
    const sent = jobs.length;
    const convertedUsers = convertedUserSet.size;
    const conversionRate = sent ? Math.round((convertedUsers / sent) * 100) : 0;
    return { from: from.toISOString(), to: to.toISOString(), windowDays, summary: { sent, convertedUsers, conversions, conversionRate } };
  },
});