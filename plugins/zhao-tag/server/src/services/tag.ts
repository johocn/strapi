import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const docParams: any = {
      filters: filters || {},
      populate: {
        parent: true,
        children: true,
        icon: true,
        ...(populate || {}),
      },
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
      strapi.documents(UID).count({ filters: filters || {} }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true },
    });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
