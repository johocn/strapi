import { sendError } from "../../utils/errors";

const payService = (): any => strapi.plugin("zhao-tire").service("pay");

export default {
  async prepay(ctx: any) {
    try {
      ctx.body = await payService().prepay(ctx.request.body || {});
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async notify(ctx: any) {
    try {
      const signature =
        ctx.get?.("x-mock-sign") || ctx.request?.headers?.["x-mock-sign"] || "";
      // APIv3 验签必须使用原始报文：koa-body includeUnparsed 会挂在 body 的 Symbol 上
      const unparsed = ctx.request?.body?.[Symbol.for("unparsedBody")];
      const rawBody =
        typeof unparsed === "string" ? unparsed : typeof ctx.request?.rawBody === "string" ? ctx.request.rawBody : undefined;
      ctx.body = await payService().notify(
        ctx.request.body || {},
        signature,
        rawBody,
        ctx.request?.headers || {}
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async mockPay(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await payService().mockPay(String(body.paymentNo || ""));
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
