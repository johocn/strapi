"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JOB_UID = "plugin::zhao-sso.msg-job";
exports.default = ({ strapi }) => {
    return {
        /**
         * 我的站内信：读 provider=inapp && status=sent 的消息（按 sso-user 归属）
         * ?page&pageSize&unreadOnly  => { data: { list, unreadCount }, meta }
         */
        async myNotices(ctx) {
            var _a, _b;
            try {
                const ssoUserId = Number(((_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.documentId));
                const { page = "1", pageSize = "20", unreadOnly } = ctx.query;
                const pageNum = parseInt(page, 10);
                const pageSizeNum = parseInt(pageSize, 10);
                const where = {
                    provider: "inapp",
                    status: "sent",
                    user: ssoUserId,
                };
                if (unreadOnly === "true" || unreadOnly === "1")
                    where.readAt = { $null: true };
                const [total, unreadCount] = await Promise.all([
                    strapi.db.query(JOB_UID).count({ where }),
                    strapi.db.query(JOB_UID).count({ where: { ...where, readAt: { $null: true } } }),
                ]);
                const rows = await strapi.db.query(JOB_UID).findMany({
                    where,
                    orderBy: { sentAt: "desc" },
                    offset: (pageNum - 1) * pageSizeNum,
                    limit: pageSizeNum,
                });
                ctx.body = {
                    data: {
                        list: rows,
                        unreadCount,
                    },
                    meta: { pagination: { page: pageNum, pageSize: pageSizeNum, total } },
                };
            }
            catch (e) {
                ctx.status = e.status || 400;
                ctx.body = { error: e.message };
            }
        },
        /** 标记站内信已读（幂等，仅属主可操作） */
        async read(ctx) {
            var _a, _b, _c, _d;
            try {
                const ssoUserId = Number(((_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = ctx.state.user) === null || _b === void 0 ? void 0 : _b.documentId));
                const jobId = parseInt(ctx.params.id, 10);
                const job = await strapi.db.query(JOB_UID).findOne({ where: { id: jobId } });
                if (!job) {
                    ctx.status = 404;
                    ctx.body = { error: "消息不存在" };
                    return;
                }
                if (((_d = (_c = job.user) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : job.user) !== ssoUserId) {
                    ctx.status = 403;
                    ctx.body = { error: "无权操作" };
                    return;
                }
                if (!job.readAt) {
                    await strapi.db.query(JOB_UID).update({ where: { id: jobId }, data: { readAt: new Date() } });
                }
                ctx.body = { data: { ok: true } };
            }
            catch (e) {
                ctx.status = e.status || 400;
                ctx.body = { error: e.message };
            }
        },
    };
};
//# sourceMappingURL=notice-controller.js.map