import type { Core } from "@strapi/strapi";

const LOG_UID = "plugin::zhao-sso.sso-login-log";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async log(params: {
    userId?: number;
    loginType: string;
    provider?: string;
    channelCode?: string;
    appCode?: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    failReason?: string;
  }) {
    return strapi.db.query(LOG_UID).create({
      data: {
        user: params.userId ? { id: params.userId } : null,
        login_type: params.loginType,
        provider: params.provider || null,
        channel_code: params.channelCode || null,
        app_code: params.appCode || null,
        ip: params.ip || null,
        user_agent: params.userAgent || null,
        success: params.success,
        fail_reason: params.failReason || null,
      },
    });
  },

  async getRecentFailCount(identifier: string, windowMinutes: number = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const logs = await strapi.db.query(LOG_UID).findMany({
      where: {
        $or: [{ ip: identifier }],
        success: false,
        created_at: { $gte: since },
      },
    });
    return logs.length;
  },

  async getUserLogs(userId: number, limit: number = 20) {
    return strapi.db.query(LOG_UID).findMany({
      where: { user: { id: userId } },
      orderBy: { created_at: "desc" },
      limit,
    });
  },

  async count(where?: any) {
    return strapi.db.query(LOG_UID).count({ where });
  },

  async findManyPaginated(params: { where?: any; orderBy?: any; limit?: number; offset?: number; populate?: any }) {
    return strapi.db.query(LOG_UID).findMany({
      where: params.where || {},
      orderBy: params.orderBy || { created_at: "desc" },
      limit: params.limit,
      offset: params.offset,
      populate: params.populate,
    });
  },
});
