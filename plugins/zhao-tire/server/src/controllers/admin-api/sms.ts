import { sendError } from "../../utils/errors";

const notifyService = (): any =>
  strapi.plugin("zhao-tire").service("notify");

const operatorId = (ctx: any): number | undefined => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export default {
  async find(ctx: any) {
    try {
      ctx.body = await notifyService().list(ctx.query || {});
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async update(ctx: any) {
    try {
      const body = ctx.request.body && typeof ctx.request.body === "object"
        ? ctx.request.body
        : {};
      ctx.body = {
        data: await notifyService().update(
          ctx.params.id,
          body,
          operatorId(ctx)
        ),
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
