import { sendError } from "../../utils/errors";
import { normalizeDate, todayDateString } from "../../services/order";

const orderService = () => strapi.plugin("zhao-tire").service("order");

export default {
  async slots(ctx: any) {
    try {
      const requested = ctx.query?.date;
      const date = normalizeDate(requested) || todayDateString();
      const slotService: any = strapi.plugin("zhao-tire").service("slot");
      const [morning, afternoon] = await Promise.all([
        slotService.usage(date, "morning"),
        slotService.usage(date, "afternoon"),
      ]);
      ctx.body = { date, morning, afternoon };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async create(ctx: any) {
    try {
      const result = await orderService().create(ctx.request.body || {});
      ctx.body = result;
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async detail(ctx: any) {
    try {
      ctx.body = await orderService().detail(
        ctx.params.orderNo,
        ctx.query?.phone
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async renew(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await orderService().renew(
        ctx.params.orderNo,
        body.months,
        body.paymentMethod
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async requestOutbound(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await orderService().requestOutbound(
        ctx.params.orderNo,
        body.note
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
