"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const REF_UID = "plugin::zhao-sso.sso-referral-relation";
const FOLLOW_UID = "plugin::zhao-sso.sso-follow-up";
exports.default = ({ strapi }) => {
    async function wrap(ctx, fn) {
        try {
            ctx.body = await fn();
        }
        catch (e) {
            ctx.status = e.status || 400;
            ctx.body = { error: e.message, code: e.code || null };
        }
    }
    /** sso-authenticated policy 注入 state.ssoUser（JWT payload，sub 为 sso-user uuid）→ 解析出 sso-user 数字 id */
    const me = async (ctx) => {
        var _a, _b;
        const ssoUser = (_a = ctx.state) === null || _a === void 0 ? void 0 : _a.ssoUser;
        if (!(ssoUser === null || ssoUser === void 0 ? void 0 : ssoUser.sub))
            return null;
        const user = await strapi.plugin("zhao-sso").service("sso-user").findByUuid(ssoUser.sub);
        return (_b = user === null || user === void 0 ? void 0 : user.id) !== null && _b !== void 0 ? _b : null;
    };
    /** 校验目标下线归属当前合伙人 */
    async function assertCustomer(partnerId, customerId) {
        const rel = await strapi.db.query(REF_UID).findOne({ where: { inviter: partnerId, invitee: customerId } });
        if (!rel) {
            const e = new Error("无权查看该客户");
            e.status = 403;
            throw e;
        }
        return rel;
    }
    return {
        async myCustomers(ctx) {
            await wrap(ctx, async () => {
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                const svc = strapi.plugin("zhao-sso").service("sso-profile");
                const rels = await strapi.db.query(REF_UID).findMany({ where: { inviter: partnerId }, populate: ["invitee"] });
                const out = [];
                for (const r of rels) {
                    const cust = r.invitee;
                    if (!cust)
                        continue;
                    const prof = await svc.getProfile(cust.id);
                    out.push({ id: cust.id, username: cust.username, email: cust.email, mobile: cust.mobile, profile: prof });
                }
                return { data: out };
            });
        },
        async customerDetail(ctx) {
            await wrap(ctx, async () => {
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                await assertCustomer(partnerId, Number(ctx.params.id));
                const svc = strapi.plugin("zhao-sso").service("sso-profile");
                return { data: await svc.getProfile(Number(ctx.params.id)) };
            });
        },
        async touch(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                const customerId = Number(ctx.params.id);
                await assertCustomer(partnerId, customerId);
                const { templateCode, params = {}, link } = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
                if (!templateCode) {
                    const e = new Error("缺少 templateCode");
                    e.status = 400;
                    throw e;
                }
                const msg = strapi.plugin("zhao-sso").service("sso-msg");
                const job = await msg.sendNow({ user: customerId, scene: "partner.touch", templateCode, params, link, dedupeKey: `partner:${partnerId}:${customerId}:${templateCode}` });
                return { data: job };
            });
        },
        async listFollowUps(ctx) {
            await wrap(ctx, async () => {
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                const rows = await strapi.db.query(FOLLOW_UID).findMany({ where: { partner: partnerId }, orderBy: { id: "DESC" }, limit: 100 });
                return { data: rows };
            });
        },
        async createFollowUp(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                const { customer, content, status = "todo", nextFollowAt } = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
                if (!customer || !content) {
                    const e = new Error("缺少 customer/content");
                    e.status = 400;
                    throw e;
                }
                await assertCustomer(partnerId, Number(customer));
                const row = await strapi.db.query(FOLLOW_UID).create({ data: { partner: partnerId, customer: Number(customer), content, status, nextFollowAt } });
                return { data: row };
            });
        },
        async updateFollowUp(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const partnerId = await me(ctx);
                if (!partnerId) {
                    ctx.status = 401;
                    return { error: "未登录" };
                }
                const row = await strapi.db.query(FOLLOW_UID).findOne({ where: { id: Number(ctx.params.id), partner: partnerId } });
                if (!row) {
                    ctx.status = 403;
                    return { error: "无权操作" };
                }
                const updated = await strapi.db.query(FOLLOW_UID).update({ where: { id: row.id }, data: ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {} });
                return { data: updated };
            });
        },
    };
};
//# sourceMappingURL=partner-controller.js.map