import { sendError } from "../../utils/errors";

const inventoryService = (): any =>
  strapi.plugin("zhao-tire").service("inventory");

const operatorId = (ctx: any): number | undefined => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export default {
  async find(ctx: any) {
    try {
      ctx.body = await inventoryService().list(ctx.query || {});
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async expiring(ctx: any) {
    try {
      ctx.body = await inventoryService().expiring(ctx.query || {});
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async remind(ctx: any) {
    try {
      const body = ctx.request.body && typeof ctx.request.body === "object"
        ? ctx.request.body
        : {};
      ctx.body = await inventoryService().remind(body, operatorId(ctx));
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
