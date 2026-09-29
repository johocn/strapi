"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UID = "plugin::zhao-website.invite-trace";
/**
 * 邀请码流转埋点：记录 inviteCode/storedCode 在各环节（分享→落地→登录→回跳）的可见状态，
 * 用于定位邀请码失效/丢失的具体环节。埋点失败不抛错、不阻断主流程。
 */
exports.default = ({ strapi }) => ({
    /**
     * 写入一条邀请码流转埋点（公开、无 site 维度；失败静默）。
     */
    async createPublic(data) {
        try {
            const record = await strapi.db.query(UID).create({ data });
            strapi.plugin("zhao-website").service("eco-hook")?.send({
                action: "distribute",
                ssoId: data.inviterId ?? data.userId,
                targetId: data.targetId,
            });
            return record;
        }
        catch (e) {
            strapi.log.warn("[invite-trace] 埋点写入失败", e);
            return null;
        }
    },
});
//# sourceMappingURL=invite-trace.js.map