// server/src/controllers/publish-gallery.ts

import type { Core } from '@strapi/strapi';

const UID = 'plugin::zhao-studio.publish-gallery';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    const query = { ...ctx.query };
    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 10;

    const findManyRes: any = await strapi.documents(UID).findMany({
      ...query,
      pagination: { page, pageSize },
      sort: { createdAt: 'desc' },
    });
    const records = Array.isArray(findManyRes) ? findManyRes : (findManyRes?.records || []);
    const total = await strapi.documents(UID).count({ filters: query.filters || {} });

    ctx.body = {
      data: records,
      meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
    };
  },

  async findOne(ctx: any) {
    const record = await strapi.documents(UID).findOne({ documentId: ctx.params.id });
    ctx.body = { data: record };
  },

  async create(ctx: any) {
    const { data } = ctx.request.body;
    const record = await strapi.documents(UID).create({ data });
    ctx.body = { data: record };
  },

  async update(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    const record = await strapi.documents(UID).update({ documentId: id, data });
    ctx.body = { data: record };
  },

  async delete(ctx: any) {
    await strapi.documents(UID).delete({ documentId: ctx.params.id });
    ctx.body = { data: { success: true } };
  },
});
