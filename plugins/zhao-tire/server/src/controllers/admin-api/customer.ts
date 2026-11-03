import { sendError } from "../../utils/errors";

export default {
  async find(ctx: any) {
    try {
      const service: any = strapi.plugin("zhao-tire").service("customer");
      ctx.body = await service.list(ctx.query || {});
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
