import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.plugin("zhao-sso").service("sso-wx-callback");

  /** 从 Koa ctx 提取原始 XML 请求体（兼容 rawBody / body 字符串 / 未解析原始流 三种形态） */
  async function extractXml(ctx: any): Promise<string> {
    if (typeof ctx.request.rawBody === "string" && ctx.request.rawBody.trim()) {
      return ctx.request.rawBody;
    }
    if (typeof ctx.request.body === "string" && ctx.request.body.trim()) {
      return ctx.request.body;
    }
    if (ctx.request.body && typeof ctx.request.body === "object") {
      return JSON.stringify(ctx.request.body);
    }
    // Strapi(koa-body) 默认不解析 text/xml，此处回退读取原始请求流
    return new Promise<string>((resolve, reject) => {
      if (!ctx.req || typeof ctx.req.on !== "function") {
        return resolve("");
      }
      const chunks: Buffer[] = [];
      ctx.req.on("data", (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      ctx.req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      ctx.req.on("error", reject);
    });
  }

  return {
    /** GET 接入验证：验签通过返回 echostr，否则 403 */
    async verify(ctx: any) {
      const ok = await svc().verifySignature(ctx.query);
      if (!ok) {
        ctx.status = 403;
        ctx.body = "invalid signature";
        return;
      }
      ctx.body = ctx.query.echostr || "success";
    },

    /** POST 事件/消息回调：先验签，失败 403（不落库），通过后分发事件 */
    async callback(ctx: any) {
      const ok = await svc().verifySignature(ctx.query);
      if (!ok) {
        ctx.status = 403;
        ctx.body = "invalid signature";
        return;
      }
      const xml = await extractXml(ctx);
      const reply = await svc().handleXml(xml);
      ctx.type = "text/xml; charset=utf-8";
      ctx.body = reply;
    },

    /** 后台：获取服务器配置（用于填入公众号服务器地址/Token） */
    async serverConfig(ctx: any) {
      const cfg = await svc().getServerConfig();
      ctx.body = { data: cfg };
    },
  };
};