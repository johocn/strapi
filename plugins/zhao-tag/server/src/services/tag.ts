import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-tag.tag";

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

    // 提取 tagGroup 过滤条件，改用 knex 查 join 表（Strapi v5 manyToOne filter 不稳定）
    const tagGroupFilter = filters?.tagGroup;
    let effectiveFilters = { ...filters };

    // siteId 筛选：返回公共标签 + 本站标签
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

    // isPublic 显式筛选
    if (isPublic !== undefined) {
      effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
    }

    let tagIdScope: number[] | null = null;

    if (tagGroupFilter) {
      delete effectiveFilters.tagGroup;
      const knex = strapi.db.connection;
      let tagGroupId: number | null = null;

      // 解析 $eq 操作符（Strapi v5 filter 语法）
      const resolveEq = (val: any) => {
        if (val && typeof val === 'object' && '$eq' in val) return val.$eq;
        return val;
      };

      if (tagGroupFilter.documentId) {
        const docId = resolveEq(tagGroupFilter.documentId);
        const group = await knex('zhao_tag_groups').where('document_id', docId).first();
        tagGroupId = group?.id;
      } else if (tagGroupFilter.id) {
        tagGroupId = Number(resolveEq(tagGroupFilter.id));
      } else if (tagGroupFilter.slug) {
        const slug = resolveEq(tagGroupFilter.slug);
        if (slug) {
          const group = await knex('zhao_tag_groups').where('slug', slug).first();
          tagGroupId = group?.id;
        }
      }

      if (tagGroupId) {
        const rows = await knex('zhao_tags_tag_group_lnk')
          .where('tag_group_id', tagGroupId)
          .select('tag_id');
        tagIdScope = rows.map((r: any) => r.tag_id);
        if (tagIdScope.length === 0) {
          return { list: [], pagination: { page, pageSize, total: 0, pageCount: 0 } };
        }
        effectiveFilters.id = { $in: tagIdScope };
      }
    }

    const docParams: any = {
      filters: effectiveFilters,
      populate: {
        parent: true,
        children: true,
        icon: true,
        tagGroup: true,
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
      populate: { parent: true, children: true, icon: true, tagGroup: true },
    });
  },

  async create(data: any) {
    validatePublicSite(data);
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true, site: true },
    });
  },

  async update(documentId: string, data: any) {
    validatePublicSite(data);
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true, site: true },
    });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
