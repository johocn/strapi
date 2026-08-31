import type { Core } from "@strapi/strapi";

const SIGNS_UID = "plugin::zhao-point.activity-signup";

export default ({ strapi }: { strapi: any }) => ({
  /**
   * 按手动 SOP 待办的 audience 条件解析目标 up_user 名单（供 zhao-sso 的 dispatchManualTodo 委托调用）。
   * audience: { activityDocumentId, filter: "registered"|"noshow"|"recap"|"repurchase" }
   * 返回 up_user.id 数组（number[]）。
   */
  async resolveAudience(audience: any) {
    const { activityDocumentId, filter } = audience || {};
    if (!activityDocumentId) return [];
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityDocumentId });
    if (!act) return [];
    const signs = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: act.id, status: "active" },
      populate: ["user"],
    });
    return signs
      .filter((s: any) => {
        const attended = !!s.attendedAt;
        if (filter === "noshow") return !attended;
        if (filter === "recap" || filter === "registered") return true; // 回放/全体报名者
        if (filter === "repurchase") return attended; // 复购面向到场者
        return true;
      })
      .map((s: any) => s.user?.id ?? s.user)
      .filter((id: number | undefined) => Number.isFinite(id));
  },
});