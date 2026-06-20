import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.knowledge-point";
const TARGET_TYPE = "plugin::zhao-course.knowledge-point";

function extractTagIds(result: any): string[] {
  if (!result?.tags) return [];
  return result.tags.map((t: any) => t.documentId).filter(Boolean);
}

async function syncTagIndex(strapi: Core.Strapi, targetType: string, targetId: string, tagIds: string[]) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").sync(targetType, targetId, tagIds);
  } catch (e) {
    strapi.log.error(`[tag-index sync] ${targetType}/${targetId} failed: ${e}`);
  }
}

async function removeTagIndex(strapi: Core.Strapi, targetType: string, targetId: string) {
  try {
    await strapi.plugin("zhao-tag").service("tag-index").remove(targetType, targetId);
  } catch (e) {
    strapi.log.error(`[tag-index remove] ${targetType}/${targetId} failed: ${e}`);
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(query: any = {}) {
    const { filters, populate, sort, pagination, fields, locale } = query;

    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const docParams: any = {
      filters: filters || {},
      populate: {
        course: true,
        tags: true,
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
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({ documentId, populate: { course: true, tags: true } });
  },

  async create(data: any) {
    const result = await strapi.documents(UID).create({ data, populate: { course: true, tags: true } });
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },

  async update(documentId: string, data: any) {
    const result = await strapi.documents(UID).update({ documentId, data, populate: { course: true, tags: true } });
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },

  async delete(documentId: string) {
    const result = await strapi.documents(UID).delete({ documentId });
    await removeTagIndex(strapi, TARGET_TYPE, documentId);
    return result;
  },
});
