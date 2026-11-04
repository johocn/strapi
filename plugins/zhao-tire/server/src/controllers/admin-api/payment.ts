import { createError, sendError } from "../../utils/errors";

const PAYMENT_UID = "plugin::zhao-tire.tire-payment";

const paymentService = (): any =>
  strapi.plugin("zhao-tire").service("payment");

const operatorName = (ctx: any): string | undefined => {
  const user = ctx.state?.user;
  if (!user) return undefined;
  return String(
    user.username || user.email || user.firstname || user.id || ""
  ) || undefined;
};

export default {
  async find(ctx: any) {
    try {
      const query = ctx.query || {};
      ctx.body = await paymentService().list({
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        orderNo: query.orderNo,
        channel: query.channel,
      });
    } catch (error) {
      sendError(ctx, error);
    }
  },

  /** 确认到账：把 pending 流水置为 paid */
  async confirm(ctx: any) {
    try {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw createError("VALIDATION_FAILED", 400, "流水 id 不合法");
      }
      const payment: any = await strapi.db.query(PAYMENT_UID).findOne({
        where: { id },
      });
      if (!payment) throw createError("PAYMENT_NOT_FOUND", 404, "支付流水不存在");
      const result = await paymentService().settle(payment.paymentNo, {
        externalNo: `ADMIN-CONFIRM-${payment.paymentNo}`,
        raw: { source: "admin-confirm", operator: operatorName(ctx) },
      });
      ctx.body = result;
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
