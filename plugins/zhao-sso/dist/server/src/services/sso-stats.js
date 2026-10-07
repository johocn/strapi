"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SOP_RULE_UID = "plugin::zhao-sso.sop-rule";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_VERSION_UID = "plugin::zhao-sso.msg-template-version";
const DATE_MS = 86400000;
/** 只读门面（隔离：不直查他域表，经对应插件 service 调用） */
function pointGate(strapi) {
    var _a, _b;
    return (strapi.plugin && ((_b = (_a = strapi.plugin("zhao-point")) === null || _a === void 0 ? void 0 : _a.service) === null || _b === void 0 ? void 0 : _b.call(_a, "gate"))) || null;
}
function courseGate(strapi) {
    var _a, _b;
    return (strapi.plugin && ((_b = (_a = strapi.plugin("zhao-course")) === null || _a === void 0 ? void 0 : _a.service) === null || _b === void 0 ? void 0 : _b.call(_a, "gate"))) || null;
}
exports.default = ({ strapi }) => ({
    async getSopStats(opts) {
        const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
        const to = opts.to ? new Date(opts.to) : new Date();
        if (from.getTime() > to.getTime()) {
            const err = new Error("from 不能晚于 to");
            err.status = 400;
            throw err;
        }
        const range = { createdAt: { $gte: from, $lte: to } };
        const rules = await strapi.db.query(SOP_RULE_UID).findMany({});
        const ruleByScene = new Map();
        for (const r of rules) {
            if (!ruleByScene.has(r.scene))
                ruleByScene.set(r.scene, []);
            ruleByScene.get(r.scene).push(r);
        }
        const sceneSet = new Set([...ruleByScene.keys()]);
        if (opts.scene) {
            sceneSet.add(opts.scene);
        }
        else {
            // 无 scene 筛选时，补齐仅存在 job 的 scene（无对应 sop-rule 的独立场景也要进漏斗）
            const jobScenes = await strapi.db.query(MSG_JOB_UID).findMany({ select: ["scene"] });
            for (const s of jobScenes)
                sceneSet.add(s.scene);
        }
        const scenes = Array.from(sceneSet).filter((s) => (opts.scene ? s === opts.scene : true));
        const countBy = (scene, status) => status
            ? strapi.db.query(MSG_JOB_UID).count({ where: { scene, status, ...range } })
            : strapi.db.query(MSG_JOB_UID).count({ where: { scene, ...range } });
        const rows = [];
        const summary = { sceneCount: 0, total: 0, sent: 0, failed: 0, quotaLimited: 0, pending: 0, sentRate: 0 };
        for (const s of scenes) {
            const [total, sent, failed, quota, pending, cancelled] = await Promise.all([
                countBy(s), countBy(s, "sent"), countBy(s, "failed"), countBy(s, "quota_limited"), countBy(s, "pending"), countBy(s, "cancelled"),
            ]);
            let clicks = 0;
            const ruleList = ruleByScene.get(s) || [];
            for (const r of ruleList) {
                if (!r.templateCode)
                    continue;
                const tpl = await strapi.db.query(MSG_TEMPLATE_UID).findOne({ where: { code: r.templateCode } });
                if (!tpl)
                    continue;
                const vers = await strapi.db.query(MSG_VERSION_UID).findMany({ where: { template: tpl.id } });
                for (const v of vers)
                    clicks += v.clickCount || 0;
            }
            const sentRate = total ? Math.round((sent / total) * 100) : 0;
            rows.push({
                scene: s,
                rules: ruleList.map((r) => { var _a, _b, _c; return ({ code: r.code, name: (_a = r.name) !== null && _a !== void 0 ? _a : null, templateCode: (_b = r.templateCode) !== null && _b !== void 0 ? _b : null, source: (_c = r.source) !== null && _c !== void 0 ? _c : null }); }),
                total, sent, failed, quotaLimited: quota, pending, cancelled, sentRate, clicks,
            });
            summary.sceneCount += 1;
            summary.total += total;
            summary.sent += sent;
            summary.failed += failed;
            summary.quotaLimited += quota;
            summary.pending += pending;
        }
        summary.sentRate = summary.total ? Math.round((summary.sent / summary.total) * 100) : 0;
        return { from: from.toISOString(), to: to.toISOString(), summary, rows };
    },
    async getRepurchaseStats(opts) {
        var _a, _b;
        const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
        const to = opts.to ? new Date(opts.to) : new Date();
        if (from.getTime() > to.getTime()) {
            const err = new Error("from 不能晚于 to");
            err.status = 400;
            throw err;
        }
        // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
        const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
        const windowDays = Number((_a = rule === null || rule === void 0 ? void 0 : rule.conversionWindowDays) !== null && _a !== void 0 ? _a : 7) || 7;
        const windowMs = windowDays * DATE_MS;
        // 区间内送达的复购触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
        const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
            where: { scene: "activity.repurchase", status: "sent", sentAt: { $gte: from, $lte: to } },
            populate: { user: { select: ["id"] } },
        });
        const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
        const convertedUserSet = new Set();
        let conversions = 0;
        for (const j of jobs) {
            // user 可能为 populate 返回的对象 {id}，或未被 populate 时的裸 id
            const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
            if (!ssoUserId)
                continue;
            const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
            if (!up)
                continue;
            const userId = up.id;
            const from2 = new Date(j.sentAt);
            const to2 = new Date(from2.getTime() + windowMs);
            const cnt = await (((_b = pointGate(strapi)) === null || _b === void 0 ? void 0 : _b.countActiveSignups)
                ? pointGate(strapi).countActiveSignups(userId, from2, to2)
                : 0);
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
    async getCourseD7Stats(opts) {
        var _a, _b;
        const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
        const to = opts.to ? new Date(opts.to) : new Date();
        if (from.getTime() > to.getTime()) {
            const err = new Error("from 不能晚于 to");
            err.status = 400;
            throw err;
        }
        // 窗口天数：scene=course.d7 的 rule.conversionWindowDays ?? 7（D7）
        const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
        const windowDays = Number((_a = rule === null || rule === void 0 ? void 0 : rule.conversionWindowDays) !== null && _a !== void 0 ? _a : 7) || 7;
        const windowMs = windowDays * DATE_MS;
        // 区间内送达的课后 D7 触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
        const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
            where: { scene: "course.d7", status: "sent", sentAt: { $gte: from, $lte: to } },
            populate: { user: { select: ["id"] } },
        });
        const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
        const convertedUserSet = new Set();
        let conversions = 0;
        for (const j of jobs) {
            const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
            if (!ssoUserId)
                continue;
            const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
            if (!up)
                continue;
            const userId = up.id;
            const from2 = new Date(j.sentAt);
            const to2 = new Date(from2.getTime() + windowMs);
            // 窗口内再报新课（status=enrolled）计为转化——经课程门面
            const cnt = await (((_b = courseGate(strapi)) === null || _b === void 0 ? void 0 : _b.countNewEnrolls)
                ? courseGate(strapi).countNewEnrolls(userId, from2, to2)
                : 0);
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
    async getCourseCompletionStats(opts) {
        var _a, _b;
        const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
        const to = opts.to ? new Date(opts.to) : new Date();
        if (from.getTime() > to.getTime()) {
            const err = new Error("from 不能晚于 to");
            err.status = 400;
            throw err;
        }
        // 窗口天数：scene=course.d7 的 rule.conversionWindowDays ?? 7
        const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "course.d7" } });
        const windowDays = Number((_a = rule === null || rule === void 0 ? void 0 : rule.conversionWindowDays) !== null && _a !== void 0 ? _a : 7) || 7;
        const windowMs = windowDays * DATE_MS;
        // 区间内送达的课内/课后触达 job（user 为 manyToOne，需 populate 才能拿到关联 id）
        const jobs = await strapi.db.query(MSG_JOB_UID).findMany({
            where: { scene: { $in: ["course.d7", "course.activate"] }, status: "sent", sentAt: { $gte: from, $lte: to } },
            populate: { user: { select: ["id"] } },
        });
        const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
        const convertedUserSet = new Set();
        let conversions = 0;
        for (const j of jobs) {
            const ssoUserId = j.user && typeof j.user === "object" ? j.user.id : j.user;
            if (!ssoUserId)
                continue;
            const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
            if (!up)
                continue;
            const userId = up.id;
            const from2 = new Date(j.sentAt);
            const to2 = new Date(from2.getTime() + windowMs);
            // 窗口内课程完课（isCompleted=true 且 completedAt 落在窗口内）计为转化——经课程门面
            const cnt = await (((_b = courseGate(strapi)) === null || _b === void 0 ? void 0 : _b.countCompletedProgress)
                ? courseGate(strapi).countCompletedProgress(userId, from2, to2)
                : 0);
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
    async getRepurchaseLeads(opts) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const from = opts.from ? new Date(opts.from) : new Date(Date.now() - 30 * DATE_MS);
        const to = opts.to ? new Date(opts.to) : new Date();
        if (from.getTime() > to.getTime()) {
            const err = new Error("from 不能晚于 to");
            err.status = 400;
            throw err;
        }
        const page = Number(opts.page) || 1;
        const pageSize = Number(opts.pageSize) || 20;
        // 窗口天数：scene=activity.repurchase 的 rule.conversionWindowDays ?? 7
        const rule = await strapi.db.query(SOP_RULE_UID).findOne({ where: { scene: "activity.repurchase" } });
        const windowDays = Number((_a = rule === null || rule === void 0 ? void 0 : rule.conversionWindowDays) !== null && _a !== void 0 ? _a : 7) || 7;
        const windowMs = windowDays * DATE_MS;
        const base = { sentAt: { $gte: from, $lte: to } };
        let where = { scene: "activity.repurchase", ...base };
        if (opts.status) {
            if (opts.status === "none") {
                // none=未跟进: 本轮语境下指未标记 followed/deal 的记录(默认为 NULL 或 'none'), 用顶层 $or 兼容空值
                where = {
                    $and: [{ scene: "activity.repurchase" }, base, { $or: [{ followStatus: "none" }, { followStatus: { $null: true } }] }],
                };
            }
            else {
                where.followStatus = opts.status;
            }
        }
        const result = await strapi.db.query(MSG_JOB_UID).findPage({
            where,
            populate: { user: true },
            orderBy: { sentAt: "desc" },
            page,
            pageSize,
        });
        const ssoSvc = strapi.plugin("zhao-sso").service("sso-profile");
        const summary = { total: 0, followed: 0, deal: 0 };
        const rows = [];
        for (const j of (_b = result === null || result === void 0 ? void 0 : result.results) !== null && _b !== void 0 ? _b : []) {
            summary.total += 1;
            if (j.followStatus === "followed")
                summary.followed += 1;
            if (j.followStatus === "deal")
                summary.deal += 1;
            const userObj = typeof j.user === "object" && j.user ? j.user : null;
            const ssoUserId = userObj ? userObj.id : j.user;
            let upId = null;
            if (ssoUserId) {
                const up = await ssoSvc.resolveUpUserForSsoUser(ssoUserId);
                upId = (_c = up === null || up === void 0 ? void 0 : up.id) !== null && _c !== void 0 ? _c : null;
            }
            let reorderedCount = 0;
            if (upId) {
                const touchTime = j.sentAt || j.scheduledAt || j.createdAt;
                if (touchTime) {
                    reorderedCount = await (((_d = pointGate(strapi)) === null || _d === void 0 ? void 0 : _d.countActiveSignups)
                        ? pointGate(strapi).countActiveSignups(upId, new Date(touchTime), new Date(new Date(touchTime).getTime() + windowMs))
                        : 0);
                }
            }
            rows.push({
                id: j.id,
                status: j.status,
                followStatus: (_e = j.followStatus) !== null && _e !== void 0 ? _e : "none",
                followRemark: (_f = j.followRemark) !== null && _f !== void 0 ? _f : null,
                touchTime: j.sentAt || j.scheduledAt || j.createdAt || null,
                windowDays,
                reorderedCount,
                user: {
                    id: (_g = userObj === null || userObj === void 0 ? void 0 : userObj.id) !== null && _g !== void 0 ? _g : ssoUserId,
                    upId,
                    username: (_h = userObj === null || userObj === void 0 ? void 0 : userObj.username) !== null && _h !== void 0 ? _h : null,
                    mobile: (_j = userObj === null || userObj === void 0 ? void 0 : userObj.mobile) !== null && _j !== void 0 ? _j : null,
                    email: (_k = userObj === null || userObj === void 0 ? void 0 : userObj.email) !== null && _k !== void 0 ? _k : null,
                },
            });
        }
        return {
            from: from.toISOString(),
            to: to.toISOString(),
            windowDays,
            summary,
            pagination: (_l = result === null || result === void 0 ? void 0 : result.pagination) !== null && _l !== void 0 ? _l : {},
            rows,
        };
    },
    async updateRepurchaseFollow({ jobId, status, remark }) {
        if (!["none", "followed", "deal"].includes(status)) {
            const err = new Error("status 必须是 none/followed/deal 之一");
            err.status = 400;
            throw err;
        }
        const existing = await strapi.db.query(MSG_JOB_UID).findOne({ where: { id: jobId } });
        if (!existing) {
            const err = new Error("msg-job 不存在");
            err.status = 404;
            throw err;
        }
        const updated = await strapi.db.query(MSG_JOB_UID).update({
            where: { id: jobId },
            data: { followStatus: status, ...(remark !== undefined ? { followRemark: remark } : {}) },
        });
        return updated;
    },
});
//# sourceMappingURL=sso-stats.js.map