import type { Core } from "@strapi/strapi";

const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const QUOTA_CONFIG_UID = "plugin::zhao-sso.sso-quota-config";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * 解析生效配置：模板显式覆盖 > 全局默认(sso_quota_configs 首行)
   * @returns { dailyCap, cooldownMinutes }
   */
  async function resolveConfig(templateId: number | null) {
    const cfg = (await strapi.db.query(QUOTA_CONFIG_UID).findOne({})) || {};
    const defDaily = typeof cfg.maxDailyPerUser === "number" ? cfg.maxDailyPerUser : 10;
    const defCool = typeof cfg.cooldownMinutes === "number" ? cfg.cooldownMinutes : 120;
    let dailyCap = defDaily;
    let cooldownMinutes = defCool;
    if (templateId) {
      const t = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { id: templateId } });
      if (t && typeof t.dailyCap === "number") dailyCap = t.dailyCap;
      if (t && typeof t.cooldownMinutes === "number") cooldownMinutes = t.cooldownMinutes;
    }
    return { dailyCap, cooldownMinutes, source: templateId ? "template" : "global" };
  }

  return {
    /**
     * 频控判定（发送前调用）
     * @param opts { userId, scene, templateId }
     * @returns { allowed: boolean, reason?: 'daily_cap'|'cooldown', detail? }
     */
    async evaluate(opts: { userId: number; scene: string; templateId?: number | null }) {
      const { userId, scene, templateId } = opts;
      if (!userId) return { allowed: true };

      const cfg = await resolveConfig(templateId || null);

      // 每日总条数上限：当日 status='sent' 且 sentAt >= 今日0点
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      // 说明：user 为 link-table 关系（sso_msg_jobs 无 user_id 列），须用 { user: { id } } 筛，
      //       与 resolveToTarget/sso-user 等既有的 link-table 关系过滤写法保持一致，否则条件恒空。
      const sentCount = await strapi.db.query(MSG_JOB_UID).count({
        where: { user: { id: userId }, status: "sent", sentAt: { $gte: dayStart } },
      });
      if (sentCount >= cfg.dailyCap) {
        return { allowed: false, reason: "daily_cap", detail: { sentCount, dailyCap: cfg.dailyCap, source: cfg.source } };
      }

      // 场景冷却：同用户同 scene 最近一条 sent 距今 < cooldownMinutes
      // 说明：避免 relation where(user:{id})+orderBy 的 Strapi 编译缺陷(Undefined binding t2.id)，
      //       改用非关系 where+orderBy 拉最近 sent 后内存过滤 userId（与 sso-msg.resolveToTarget 同款规避写法）。
      const recents = await strapi.db.query(MSG_JOB_UID).findMany({
        where: { scene, status: "sent" },
        orderBy: { sentAt: "DESC" },
        limit: 50,
        populate: { user: true },
      });
      const last = recents.find((x: any) => (typeof x.user === "number" ? x.user === userId : x.user?.id === userId)) || null;
      if (last && last.sentAt) {
        const gapMin = (Date.now() - new Date(last.sentAt).getTime()) / 60000;
        if (gapMin < cfg.cooldownMinutes) {
          return { allowed: false, reason: "cooldown", detail: { gapMin: Math.round(gapMin), cooldownMinutes: cfg.cooldownMinutes, lastSentAt: last.sentAt, source: cfg.source } };
        }
      }

      return { allowed: true };
    },
  };
};