import { sendError } from "../../utils/errors";

export default {
  async get(ctx: any) {
    try {
      ctx.body = await strapi.plugin("zhao-tire").service("site").get();
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
