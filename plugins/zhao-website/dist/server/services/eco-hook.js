"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const PLUGIN_NAME = "zhao-website";
const SCOPE = "joho";
function resolveTarget(strapi) {
    const cfg = strapi.config?.get(`plugin::${PLUGIN_NAME}`) || {};
    return {
        url: process.env.GAME_ECO_URL || process.env.GAME_URL || cfg.eco?.url || "",
        secret: process.env.GAME_ECO_SECRET || process.env.ECO_SHARED_SECRET || cfg.eco?.secret || "",
    };
}
exports.default = ({ strapi }) => ({
    async send(opts) {
        try {
            const { ssoId, targetId, action } = opts;
            if (ssoId == null || ssoId === "")
                return;
            const { url, secret } = resolveTarget(strapi);
            if (!url || !secret)
                return;
            const body = {
                action,
                scope: SCOPE,
                ssoId: String(ssoId),
                targetId: targetId != null ? String(targetId) : "",
                extra: opts.extra || {},
            };
            const ts = Math.floor(Date.now() / 1000);
            const sign = crypto_1.default.createHmac("sha256", secret).update(`${JSON.stringify(body)}|${ts}`).digest("hex");
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Eco-Sign": sign, "X-Eco-Ts": String(ts) },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(2000),
            });
        }
        catch (e) {
            console.warn(`[eco-hook:${PLUGIN_NAME}] ${opts.action} 上报失败: ${e?.message || e}`);
        }
    },
});
//# sourceMappingURL=eco-hook.js.map