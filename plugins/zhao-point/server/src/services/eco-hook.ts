import crypto from "crypto";
import type { Core } from "@strapi/strapi";

const PLUGIN_NAME = "zhao-point";
const SCOPE = "joho";

function resolveTarget(strapi: Core.Strapi) {
  const cfg: any = strapi.config?.get(`plugin::${PLUGIN_NAME}`) || {};
  return {
    url: process.env.GAME_ECO_URL || process.env.GAME_URL || cfg.eco?.url || "",
    secret: process.env.GAME_ECO_SECRET || process.env.ECO_SHARED_SECRET || cfg.eco?.secret || "",
  };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async send(opts: { action: string; ssoId?: string | number | null; targetId?: string | number | null; extra?: Record<string, unknown> }) {
    try {
      const { ssoId, targetId, action } = opts;
      if (ssoId == null || ssoId === "") return;
      const { url, secret } = resolveTarget(strapi);
      if (!url || !secret) return;
      const body = {
        action,
        scope: SCOPE,
        ssoId: String(ssoId),
        targetId: targetId != null ? String(targetId) : "",
        extra: opts.extra || {},
      };
      const ts = Math.floor(Date.now() / 1000);
      const sign = crypto.createHmac("sha256", secret).update(`${JSON.stringify(body)}|${ts}`).digest("hex");
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Eco-Sign": sign, "X-Eco-Ts": String(ts) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
    } catch (e: any) {
      console.warn(`[eco-hook:${PLUGIN_NAME}] ${opts.action} 上报失败: ${e?.message || e}`);
    }
  },
});
