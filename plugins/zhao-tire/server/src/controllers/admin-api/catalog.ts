import { sendError } from "../../utils/errors";

const catalogService = (): any =>
  strapi.plugin("zhao-tire").service("catalog");

export const buildCollectionCrud = (name: string) => ({
  async list(ctx: any) {
    try {
      ctx.body = { data: await catalogService().list(name) };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async create(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = { data: await catalogService().create(name, body) };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async update(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = {
        data: await catalogService().update(name, ctx.params.id, body),
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async remove(ctx: any) {
    try {
      ctx.body = await catalogService().remove(name, ctx.params.id);
    } catch (error) {
      sendError(ctx, error);
    }
  },
});

export const prefixHandlers = (
  prefix: string,
  handlers: Record<string, Function>
) => {
  const result: Record<string, Function> = {};
  for (const [key, handler] of Object.entries(handlers)) {
    result[`${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`] = handler;
  }
  return result;
};

export default {
  ...prefixHandlers("package", buildCollectionCrud("packages")),
  ...prefixHandlers("addon", buildCollectionCrud("addons")),

  async getConfig(ctx: any) {
    try {
      ctx.body = { data: await catalogService().getConfig() };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async updateConfig(ctx: any) {
    try {
      const body = ctx.request.body || {};
      ctx.body = { data: await catalogService().updateConfig(body) };
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
