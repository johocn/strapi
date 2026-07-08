import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag-group";

function validatePublicSite(data: any) {
  if (data.isPublic === true && data.site) {
    const e: any = new Error("公共标签不能关联站点");
    e.status = 400;
    throw e;
  }
  if (data.isPublic === false && !data.site) {
    const e: any = new Error("站点标签必须关联站点");
    e.status = 400;
    throw e;
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale, siteId, isPublic } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    let effectiveFilters = { ...(filters || {}) };

    if (siteId) {
      const knex = strapi.db.connection;
      const siteRow = await knex('zhao_site_configs').where('document_id', siteId).first();
      const siteNumericId = siteRow?.id;
      if (siteNumericId) {
        effectiveFilters.$or = [
          { isPublic: true },
          { site: siteNumericId },
        ];
      }
    }

    if (isPublic !== undefined) {
      effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
    }

    const docParams: any = {
      filters: effectiveFilters,
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
      strapi.documents(UID).count({ filters: effectiveFilters }),
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
    validatePublicSite(data);
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true, site: true },
    });
  },

  async update(documentId: string, data: any) {
    validatePublicSite(data);
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true, site: true },
    });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
