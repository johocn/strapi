"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LOG_UID = "plugin::zhao-sso.sso-login-log";
exports.default = ({ strapi }) => ({
    async log(params) {
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
    async getRecentFailCount(identifier, windowMinutes = 5) {
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
    async getUserLogs(userId, limit = 20) {
        return strapi.db.query(LOG_UID).findMany({
            where: { user: { id: userId } },
            orderBy: { created_at: "desc" },
            limit,
        });
    },
    async count(where) {
        return strapi.db.query(LOG_UID).count({ where });
    },
    async findManyPaginated(params) {
        return strapi.db.query(LOG_UID).findMany({
            where: params.where || {},
            orderBy: params.orderBy || { created_at: "desc" },
            limit: params.limit,
            offset: params.offset,
            populate: params.populate,
        });
    },
});
