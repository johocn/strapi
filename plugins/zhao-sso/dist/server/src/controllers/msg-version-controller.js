"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VERSION_UID = "plugin::zhao-sso.msg-template-version";
const TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const JOB_UID = "plugin::zhao-sso.msg-job";
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
    /** 解析模板（documentId 或数字 id → 数字 id） */
    async function resolveTemplate(templateId) {
        const num = Number(templateId);
        if (Number.isInteger(num) && num > 0) {
            const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: num } });
            if (t)
                return t.id;
        }
        const t = await strapi.db.query(TEMPLATE_UID).findOne({ where: { documentId: templateId } });
        if (!t) {
            const e = new Error("模板不存在");
            e.status = 404;
            throw e;
        }
        return t.id;
    }
    return {
        async list(ctx) {
            await wrap(ctx, async () => {
                var _a, _b;
                const templateId = await resolveTemplate(ctx.params.templateId);
                const rows = await strapi.db.query(VERSION_UID).findMany({
                    where: { template: templateId },
                    orderBy: { id: "DESC" },
                });
                // 点击数实时聚合（utm_source=msg, utm_campaign=code）——经 zhao-website 门面，不直查其表
                const gate = strapi.plugin ? (_b = (_a = strapi.plugin("zhao-website")) === null || _a === void 0 ? void 0 : _a.service) === null || _b === void 0 ? void 0 : _b.call(_a, "gate") : null;
                const codes = rows.map((r) => r.code).filter(Boolean);
                const clicks = ((gate === null || gate === void 0 ? void 0 : gate.countMsgClicks) ? await gate.countMsgClicks(codes) : {}) || {};
                return { data: rows.map((r) => ({ ...r, clickCountLive: clicks[r.code] || 0 })) };
            });
        },
        async create(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const templateId = await resolveTemplate(ctx.params.templateId);
                const data = ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {};
                const row = await strapi.db.query(VERSION_UID).create({
                    data: { ...data, template: templateId, sentCount: 0, successCount: 0, clickCount: 0 },
                });
                return { data: row };
            });
        },
        async update(ctx) {
            await wrap(ctx, async () => {
                var _a;
                const row = await strapi.db.query(VERSION_UID).update({
                    where: { id: Number(ctx.params.id) },
                    data: ((_a = ctx.request) === null || _a === void 0 ? void 0 : _a.body) || {},
                });
                return { data: row };
            });
        },
        async delete(ctx) {
            await wrap(ctx, async () => {
                const id = Number(ctx.params.id);
                const used = await strapi.db.query(JOB_UID).count({ where: { version: id } });
                if (used > 0) {
                    const e = new Error(`该版本已被 ${used} 个消息任务引用，无法删除`);
                    e.status = 400;
                    throw e;
                }
                await strapi.db.query(VERSION_UID).delete({ where: { id } });
                return { data: { id } };
            });
        },
        async activate(ctx) {
            await wrap(ctx, async () => {
                const id = Number(ctx.params.id);
                const row = await strapi.db.query(VERSION_UID).findOne({ where: { id } });
                if (!row) {
                    const e = new Error("版本不存在");
                    e.status = 404;
                    throw e;
                }
                // 多活语义：AB 测试需多版本并行参与加权分配，activate 仅启用目标版本；停用走 update(status=draft)
                await strapi.db.query(VERSION_UID).update({ where: { id }, data: { status: "active" } });
                return { data: await strapi.db.query(VERSION_UID).findOne({ where: { id } }) };
            });
        },
        async abStats(ctx) {
            await wrap(ctx, async () => {
                var _a, _b;
                const templateId = await resolveTemplate(ctx.params.templateId);
                const rows = await strapi.db.query(VERSION_UID).findMany({
                    where: { template: templateId },
                    orderBy: { id: "ASC" },
                });
                const out = [];
                const gate = strapi.plugin ? (_b = (_a = strapi.plugin("zhao-website")) === null || _a === void 0 ? void 0 : _a.service) === null || _b === void 0 ? void 0 : _b.call(_a, "gate") : null;
                const codes = rows.map((r) => r.code).filter(Boolean);
                const clicks = ((gate === null || gate === void 0 ? void 0 : gate.countMsgClicks) ? await gate.countMsgClicks(codes) : {}) || {};
                for (const r of rows) {
                    const click = clicks[r.code] || 0;
                    const sent = r.sentCount || 0;
                    out.push({
                        ...r,
                        clickCountLive: click,
                        clickRate: sent ? Math.round((click / sent) * 1000) / 10 : 0,
                        successRate: sent ? Math.round(((r.successCount || 0) / sent) * 1000) / 10 : 0,
                    });
                }
                return { data: out };
            });
        },
    };
};
//# sourceMappingURL=msg-version-controller.js.map