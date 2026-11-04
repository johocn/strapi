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
      ctx.body = await payService().notify(ctx.request.body || {}, signature);
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
