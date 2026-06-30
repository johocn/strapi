import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async softDelete(ctx: any) {
    try {
      const { contentType, documentId } = ctx.params;
      if (!contentType || !documentId) {
        ctx.status = 400;
        ctx.body = { error: "contentType and documentId are required" };
        return;
      }
      const result = await strapi
        .plugin("zhao-common")
        .service("soft-delete")
        .softDelete(contentType, documentId);

      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Record not found" };
        return;
      }
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },

  async restore(ctx: any) {
    try {
      const { contentType, documentId } = ctx.params;
      if (!contentType || !documentId) {
        ctx.status = 400;
        ctx.body = { error: "contentType and documentId are required" };
        return;
      }
      const result = await strapi
        .plugin("zhao-common")
        .service("soft-delete")
        .restore(contentType, documentId);

      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "Record not found" };
        return;
      }
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },

  async findDeleted(ctx: any) {
    try {
      const { contentType } = ctx.params;
      if (!contentType) {
        ctx.status = 400;
        ctx.body = { error: "contentType is required" };
        return;
      }
      const { filters, pagination, sort } = ctx.query || {};
      const result = await strapi
        .plugin("zhao-common")
        .service("soft-delete")
        .findDeleted(contentType, { filters, pagination, sort });
      ctx.status = 200;
      ctx.body = { data: result };
    } catch (error: any) {
      ctx.status = error.status ?? 500;
      ctx.body = { error: error.message };
    }
  },
});
