"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const kind$3 = "collectionType";
const collectionName$3 = "zhao_tags";
const info$3 = { "singularName": "tag", "pluralName": "tags", "displayName": "标签" };
const options$3 = { "draftAndPublish": false };
const pluginOptions$1 = { "i18n": { "localized": true } };
const attributes$3 = { "name": { "type": "string", "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "name", "required": false, "localized": true }, "description": { "type": "text", "localized": true }, "color": { "type": "string" }, "icon": { "type": "media", "multiple": false }, "tagGroup": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tag.tag-group", "inversedBy": "tags" }, "parent": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tag.tag", "inversedBy": "children" }, "children": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag", "mappedBy": "parent" }, "sort": { "type": "integer", "default": 0 }, "isPreset": { "type": "boolean", "default": false }, "isPublic": { "type": "boolean", "default": true }, "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "inversedBy": "tags" }, "indexes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag-index", "mappedBy": "tag" }, "website_articles": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article", "mappedBy": "tags" }, "website_tutorials": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.tutorial", "mappedBy": "tags" }, "website_cases": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.case", "mappedBy": "tags" }, "website_faqs": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.faq", "mappedBy": "tags" }, "website_compliances": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.compliance", "mappedBy": "tags" }, "website_downloads": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.download", "mappedBy": "tags" }, "website_products": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.product", "mappedBy": "tags" }, "deletedAt": { "type": "datetime", "default": null } };
const tagSchema = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$1,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_knowledge_points";
const info$2 = { "singularName": "knowledge-point", "pluralName": "knowledge-points", "displayName": "知识点" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "name": { "type": "string", "required": true }, "slug": { "type": "uid", "targetField": "name", "required": false }, "description": { "type": "text" }, "code": { "type": "string" }, "level": { "type": "enumeration", "enum": ["basic", "intermediate", "advanced"], "default": "basic" }, "parent": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tag.knowledge-point", "inversedBy": "children" }, "children": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.knowledge-point", "mappedBy": "parent" }, "sort": { "type": "integer", "default": 0 }, "deletedAt": { "type": "datetime", "default": null } };
const knowledgePointSchema = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_tag_indexes";
const info$1 = { "singularName": "tag-index", "pluralName": "tag-indexes", "displayName": "标签索引" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "targetType": { "type": "string", "required": true }, "targetId": { "type": "string", "required": true }, "tag": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tag.tag", "inversedBy": "indexes" }, "createdAt": { "type": "datetime" } };
const tagIndexSchema = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_tag_groups";
const info = { "singularName": "tag-group", "pluralName": "tag-groups", "displayName": "标签分组" };
const options = { "draftAndPublish": false };
const pluginOptions = { "i18n": { "localized": true } };
const attributes = { "name": { "type": "string", "required": true, "localized": true }, "slug": { "type": "uid", "targetField": "name", "required": false, "localized": true }, "description": { "type": "text", "localized": true }, "color": { "type": "string" }, "icon": { "type": "media", "multiple": false }, "sort": { "type": "integer", "default": 0 }, "isPublic": { "type": "boolean", "default": true }, "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "inversedBy": "tagGroups" }, "parent": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tag.tag-group", "inversedBy": "children" }, "children": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag-group", "mappedBy": "parent" }, "tags": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-tag.tag", "mappedBy": "tagGroup" }, "deletedAt": { "type": "datetime", "default": null } };
const tagGroupSchema = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  tag: { schema: tagSchema },
  "knowledge-point": { schema: knowledgePointSchema },
  "tag-index": { schema: tagIndexSchema },
  "tag-group": { schema: tagGroupSchema }
};
const wrap$1 = (data, meta = {}) => ({ data, meta });
const wrapList$2 = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const tag$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$2(await strapi.plugin("zhao-tag").service("tag").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-tag").service("tag").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "标签不存在" };
        return;
      }
      ctx.body = wrap$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-tag").service("tag").create(data);
      ctx.status = 201;
      ctx.body = wrap$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap$1(await strapi.plugin("zhao-tag").service("tag").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap$1(await strapi.plugin("zhao-tag").service("tag").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  }
});
const wrapList$1 = (result) => {
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const tagIndex$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList$1(await strapi.documents("plugin::zhao-tag.tag-index").findMany(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async search(ctx) {
    try {
      const { tagId, targetType } = ctx.query;
      if (!tagId) {
        ctx.status = 400;
        ctx.body = { error: "tagId 必填" };
        return;
      }
      const result = await strapi.plugin("zhao-tag").service("tag-index").searchByTag(tagId, targetType);
      ctx.body = wrapList$1(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const tagGroup$1 = ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.body = wrapList(await strapi.plugin("zhao-tag").service("tag-group").find(ctx.query));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async findOne(ctx) {
    try {
      const { documentId } = ctx.params;
      const result = await strapi.plugin("zhao-tag").service("tag-group").findOne(documentId);
      if (!result) {
        ctx.status = 404;
        ctx.body = { error: "标签分组不存在" };
        return;
      }
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async create(ctx) {
    try {
      const data = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-tag").service("tag-group").create(data);
      ctx.status = 201;
      ctx.body = wrap(result);
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async update(ctx) {
    try {
      const { documentId } = ctx.params;
      const data = ctx.request.body?.data || ctx.request.body;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("tag-group").update(documentId, data));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  },
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;
      ctx.body = wrap(await strapi.plugin("zhao-tag").service("tag-group").delete(documentId));
    } catch (err) {
      ctx.status = err.status || 400;
      ctx.body = { error: err.message };
    }
  }
});
const controllers = {
  tag: tag$1,
  "tag-index": tagIndex$1,
  "tag-group": tagGroup$1
};
const UID$2 = "plugin::zhao-tag.tag";
function validatePublicSite$1(data) {
  if (data.isPublic === true && data.site) {
    const e = new Error("公共标签不能关联站点");
    e.status = 400;
    throw e;
  }
  if (data.isPublic === false && !data.site) {
    const e = new Error("站点标签必须关联站点");
    e.status = 400;
    throw e;
  }
}
const tag = ({ strapi }) => ({
  async find(query = {}) {
    const { filters, populate, sort, pagination, fields, locale, siteId, isPublic } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;
    const tagGroupFilter = filters?.tagGroup;
    let effectiveFilters = { ...filters };
    if (siteId) {
      const knex = strapi.db.connection;
      const siteRow = await knex("zhao_site_configs").where("document_id", siteId).first();
      const siteNumericId = siteRow?.id;
      if (siteNumericId) {
        effectiveFilters.$or = [
          { isPublic: true },
          { site: siteNumericId }
        ];
      }
    }
    if (isPublic !== void 0) {
      effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
    }
    let tagIdScope = null;
    if (tagGroupFilter) {
      delete effectiveFilters.tagGroup;
      const knex = strapi.db.connection;
      let tagGroupId = null;
      const resolveEq = (val) => {
        if (val && typeof val === "object" && "$eq" in val) return val.$eq;
        return val;
      };
      if (tagGroupFilter.documentId) {
        const docId = resolveEq(tagGroupFilter.documentId);
        const group = await knex("zhao_tag_groups").where("document_id", docId).first();
        tagGroupId = group?.id;
      } else if (tagGroupFilter.id) {
        tagGroupId = Number(resolveEq(tagGroupFilter.id));
      } else if (tagGroupFilter.slug) {
        const slug = resolveEq(tagGroupFilter.slug);
        if (slug) {
          const group = await knex("zhao_tag_groups").where("slug", slug).first();
          tagGroupId = group?.id;
        }
      }
      if (tagGroupId) {
        const rows = await knex("zhao_tags_tag_group_lnk").where("tag_group_id", tagGroupId).select("tag_id");
        tagIdScope = rows.map((r) => r.tag_id);
        if (tagIdScope.length === 0) {
          return { list: [], pagination: { page, pageSize, total: 0, pageCount: 0 } };
        }
        effectiveFilters.id = { $in: tagIdScope };
      }
    }
    const docParams = {
      filters: effectiveFilters,
      populate: {
        parent: true,
        children: true,
        icon: true,
        tagGroup: true,
        ...populate || {}
      }
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;
    const [list, total] = await Promise.all([
      strapi.documents(UID$2).findMany(docParams),
      strapi.documents(UID$2).count({ filters: effectiveFilters })
    ]);
    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
    };
  },
  async findOne(documentId) {
    return strapi.documents(UID$2).findOne({
      documentId,
      populate: { parent: true, children: true, icon: true, tagGroup: true }
    });
  },
  async create(data) {
    validatePublicSite$1(data);
    return strapi.documents(UID$2).create({
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true, site: true }
    });
  },
  async update(documentId, data) {
    validatePublicSite$1(data);
    return strapi.documents(UID$2).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true, tagGroup: true, site: true }
    });
  },
  async delete(documentId) {
    return strapi.documents(UID$2).delete({ documentId });
  }
});
const UID$1 = "plugin::zhao-tag.tag-index";
const tagIndex = ({ strapi }) => ({
  /**
   * 业务方 lifecycle 调用：同步标签索引
   * 计算 diff：新增的入库，移除的删除
   */
  async sync(targetType, targetId, tagIds) {
    if (!targetType || !targetId) return;
    const existing = await strapi.documents(UID$1).findMany({
      filters: { targetType, targetId },
      populate: { tag: true }
    });
    const existingTagIds = new Set(
      existing.map((r) => r.tag?.documentId).filter(Boolean)
    );
    const newTagIds = new Set(tagIds);
    const toRemove = existing.filter(
      (r) => !newTagIds.has(r.tag?.documentId)
    );
    for (const r of toRemove) {
      if (r.documentId) {
        await strapi.documents(UID$1).delete({ documentId: r.documentId });
      }
    }
    const toAdd = tagIds.filter((id) => !existingTagIds.has(id));
    for (const tagDocumentId of toAdd) {
      await strapi.documents(UID$1).create({
        data: { targetType, targetId, tag: tagDocumentId }
      });
    }
  },
  /**
   * 业务方 lifecycle 调用：删除某业务记录的所有索引
   */
  async remove(targetType, targetId) {
    if (!targetType || !targetId) return;
    const records = await strapi.documents(UID$1).findMany({
      filters: { targetType, targetId }
    });
    for (const r of records) {
      if (r.documentId) {
        await strapi.documents(UID$1).delete({ documentId: r.documentId });
      }
    }
  },
  /**
   * 跨业务检索：按 tag 查所有关联内容
   * 返回 [{ targetType, targetId }]
   */
  async searchByTag(tagDocumentId, targetType) {
    const filters = { tag: { documentId: tagDocumentId } };
    if (targetType) filters.targetType = targetType;
    return strapi.documents(UID$1).findMany({
      filters,
      fields: ["targetType", "targetId"]
    });
  },
  /**
   * 统计：标签被引用次数
   */
  async countByTag(tagDocumentId) {
    return strapi.documents(UID$1).count({
      filters: { tag: { documentId: tagDocumentId } }
    });
  }
});
const UID = "plugin::zhao-tag.tag-group";
function validatePublicSite(data) {
  if (data.isPublic === true && data.site) {
    const e = new Error("公共标签不能关联站点");
    e.status = 400;
    throw e;
  }
  if (data.isPublic === false && !data.site) {
    const e = new Error("站点标签必须关联站点");
    e.status = 400;
    throw e;
  }
}
const tagGroup = ({ strapi }) => ({
  async find(query = {}) {
    const { filters, populate, sort, pagination, fields, locale, siteId, isPublic } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;
    let effectiveFilters = { ...filters || {} };
    if (siteId) {
      const knex = strapi.db.connection;
      const siteRow = await knex("zhao_site_configs").where("document_id", siteId).first();
      const siteNumericId = siteRow?.id;
      if (siteNumericId) {
        effectiveFilters.$or = [
          { isPublic: true },
          { site: siteNumericId }
        ];
      }
    }
    if (isPublic !== void 0) {
      effectiveFilters.isPublic = isPublic === "true" || isPublic === true;
    }
    const docParams = {
      filters: effectiveFilters,
      populate: {
        parent: true,
        children: true,
        icon: true,
        ...populate || {}
      }
    };
    if (sort) docParams.sort = sort;
    docParams.pagination = { page, pageSize };
    if (fields) docParams.fields = fields;
    if (locale) docParams.locale = locale;
    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
      strapi.documents(UID).count({ filters: effectiveFilters })
    ]);
    return {
      list,
      pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
    };
  },
  async findOne(documentId) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { parent: true, children: true, icon: true }
    });
  },
  async create(data) {
    validatePublicSite(data);
    return strapi.documents(UID).create({
      data,
      populate: { parent: true, children: true, icon: true, site: true }
    });
  },
  async update(documentId, data) {
    validatePublicSite(data);
    return strapi.documents(UID).update({
      documentId,
      data,
      populate: { parent: true, children: true, icon: true, site: true }
    });
  },
  async delete(documentId) {
    return strapi.documents(UID).delete({ documentId });
  }
});
const services = {
  tag,
  "tag-index": tagIndex,
  "tag-group": tagGroup
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.has-channel-scope"]
  }
});
const channelScopeRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由（tag） =====
    publicRoute("GET", "/tags", "tag.find"),
    publicRoute("GET", "/tags/:documentId", "tag.findOne"),
    // ===== 管理路由（tag） =====
    channelScopeRoute("GET", "/tags", "tag.find", "tag.read"),
    channelScopeRoute("GET", "/tags/:documentId", "tag.findOne", "tag.read"),
    channelScopeRoute("POST", "/tags", "tag.create", "tag.create"),
    channelScopeRoute("PUT", "/tags/:documentId", "tag.update", "tag.update"),
    channelScopeRoute("DELETE", "/tags/:documentId", "tag.delete", "tag.delete"),
    // ===== 公开路由（tag-group） =====
    publicRoute("GET", "/tag-groups", "tag-group.find"),
    publicRoute("GET", "/tag-groups/:documentId", "tag-group.findOne"),
    // ===== 管理路由（tag-group） =====
    channelScopeRoute("GET", "/tag-groups", "tag-group.find", "tag-group.read"),
    channelScopeRoute("GET", "/tag-groups/:documentId", "tag-group.findOne", "tag-group.read"),
    channelScopeRoute("POST", "/tag-groups", "tag-group.create", "tag-group.create"),
    channelScopeRoute("PUT", "/tag-groups/:documentId", "tag-group.update", "tag-group.update"),
    channelScopeRoute("DELETE", "/tag-groups/:documentId", "tag-group.delete", "tag-group.delete"),
    // ===== 管理路由（tag-index） =====
    channelScopeRoute("GET", "/tag-indexes", "tag-index.find", "tag-index.read"),
    publicRoute("GET", "/tag-indexes/search", "tag-index.search")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApi().routes
  }
};
const index = {
  register() {
  },
  bootstrap() {
  },
  destroy() {
  },
  contentTypes,
  controllers,
  services,
  routes
};
exports.default = index;
