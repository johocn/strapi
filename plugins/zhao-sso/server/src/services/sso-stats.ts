import type { Core } from "@strapi/strapi";

const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
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
    if (opts.scene) sceneSet.add(opts.scene);
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
});