import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.course";
const TARGET_TYPE = "plugin::zhao-course.course";

const DATE_FIELDS = ["enrollStartDate", "enrollEndDate", "courseStartDate", "courseEndDate", "publishDate"];

function cleanDateFields(data: any) {
  const clean = { ...data };
  for (const field of DATE_FIELDS) {
    if (clean[field] === "" || clean[field] === null || clean[field] === undefined) {
      delete clean[field];
    }
  }
  return clean;
}

/**
 * 校验渠道配置：
 * - channelScope="specific" 时 channelIds 必须非空数组
 * - channelIds 必须是数组（防字符串误填）
 * - 元素必须是数字或可转数字的字符串
 * - channelScope="specific" 时 pointChannel 必填且 ∈ channelIds
 * - channelScope="all" 时 pointChannel 应清空（归一化）
 * - 抛 COURSE_001 阻断异常数据
 */
function validateChannelConfig(data: any) {
  const scope = data.channelScope;
  if (scope === "specific") {
    const ids = data.channelIds;
    const isArray = Array.isArray(ids);
    if (!isArray || ids.length === 0) {
      const err: any = new Error("channelScope 为 specific 时，channelIds 至少要包含 1 个渠道");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
    // 类型校验
    for (const id of ids) {
      if (typeof id !== "number" && typeof id !== "string") {
        const err: any = new Error("channelIds 仅支持数字或字符串 ID");
        err.code = "COURSE_001";
        err.status = 400;
        throw err;
      }
    }
    // pointChannel 强约束：必填且 ∈ channelIds
    const pc = data.pointChannel;
    if (pc == null) {
      const err: any = new Error("channelScope 为 specific 时，pointChannel（积分归属渠道）必填");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
    const pcId = typeof pc === "object" ? (pc.id ?? pc.documentId) : pc;
    const inScope = ids.some((id: any) => String(id) === String(pcId));
    if (!inScope) {
      const err: any = new Error("pointChannel 必须是 channelIds 之一");
      err.code = "COURSE_001";
      err.status = 400;
      throw err;
    }
  }
  // channelScope="all" 时归一化 channelIds=[]，pointChannel=null
  if (scope === "all") {
    data.channelIds = [];
    data.pointChannel = null;
  }
}

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

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const publishDoc = async (documentId: string) => {
    // 1. 先更新自定义字段（status + publishDate），确保 published 快照包含这些值
    await strapi.documents(UID).update({
      documentId,
      data: {
        status: "published" as any,
        publishDate: new Date().toISOString(),
      } as any,
    });
    // 2. 通过 Strapi D&P 机制正式发布文档（快照包含步骤1的更新）
    return strapi.documents(UID).publish({
      documentId,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true,
      },
    });
  };

  const unpublishDoc = async (documentId: string) => {
    // 1. 先更新自定义字段 status='draft'，确保 draft 版本状态正确
    await strapi.documents(UID).update({
      documentId,
      data: {
        status: "draft" as any,
      } as any,
    });
    // 2. 通过 Strapi D&P 机制删除 published 快照，C 端将无法获取该课程
    return strapi.documents(UID).unpublish({
      documentId,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true,
      },
    });
  };

  return {
  /**
   * 列出渠道配置异常的课程：
   * - channelScope="specific" + channelIds 非空 + pointChannel 为空
   * - channelScope="specific" + pointChannel 不属于 channelIds
   * 返回数组：[{ documentId, title, channelScope, channelIds, pointChannel, reason }]
   */
  async listChannelConfigInvalid() {
    const docs = await strapi.db.query(UID).findMany({
      where: { channelScope: "specific" },
      select: ["documentId", "title", "channelScope", "channelIds"],
      populate: { pointChannel: { select: ["id", "documentId"] } },
      limit: 5000,
    });
    const invalid: any[] = [];
    for (const d of docs as any[]) {
      const ids: any[] = Array.isArray(d.channelIds) ? d.channelIds : [];
      if (ids.length === 0) continue;
      const pc = d.pointChannel;
      const pcId = pc ? (pc.id ?? pc.documentId ?? pc) : null;
      if (!pcId) {
        invalid.push({
          documentId: d.documentId,
          title: d.title,
          channelScope: d.channelScope,
          channelIds: ids,
          pointChannel: null,
          reason: "pointChannel 为空",
        });
        continue;
      }
      const inScope = ids.some((id: any) => String(id) === String(pcId));
      if (!inScope) {
        invalid.push({
          documentId: d.documentId,
          title: d.title,
          channelScope: d.channelScope,
          channelIds: ids,
          pointChannel: pcId,
          reason: "pointChannel 不在 channelIds 中",
        });
      }
    }
    return invalid;
  },
  async find(query: any = {}, publicOnly: boolean = false, ctxState?: {
    channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean };
    mergedChannelIds: number[];
    siteChannelIds: number[];
    crossChannelEnabled: boolean;
  }) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const mergedFilters: any = { ...filters };
    const channelScope = ctxState?.channelScope;
    const mergedChannelIds = ctxState?.mergedChannelIds || [];
    const siteChannelIds = ctxState?.siteChannelIds || [];
    const crossChannelEnabled = ctxState?.crossChannelEnabled ?? true;
    const isAdmin = !!channelScope?.all && !channelScope?.isGuest;

    // 渠道过滤策略：
    // 1) 游客（isGuest=true）：仅展示 channelScope="all" 或 (channelScope="specific" + allowCrossChannel=true) 的课程
    // 2) 登录用户：展示所有 specific 课程（通过内存过滤） + channelScope="all" 的课程
    if (channelScope?.isGuest) {
      mergedFilters.$or = [
        { channelScope: "all" },
        { channelScope: "specific", allowCrossChannel: true },
      ];
    } else {
      // 登录用户：获取所有 specific 课程，然后在内存中过滤
      mergedFilters.$or = [
        { channelScope: "all" },
        { channelScope: "specific" },
        { channelScope: null }, // 兼容旧数据
      ];
    }

    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    let list: any[] = [];

    if (isAdmin) {
      // admin 查询：直接用 db.query 绕过 D&P 机制，查所有 deleted_at IS NULL 的记录
      // 每个 document_id 可能有多行（draft + published），优先取 draft 行（published_at IS NULL）
      const dbWhere: any = { deletedAt: null };
      // 保留业务 filters（如 title 搜索、status 过滤、category 过滤）
      if (filters?.title?.$contains) dbWhere.title = { $contains: filters.title.$contains };
      if (filters?.status) dbWhere.status = filters.status;
      if (filters?.category?.documentId) {
        // category 是 manyToOne 关系，需通过 documentId 查 id
        const cat = await strapi.db.query("plugin::zhao-course.course-category").findOne({
          where: { documentId: filters.category.documentId },
          select: ["id"],
        });
        if (cat) dbWhere.category = cat.id;
      }

      const dbQueryParams: any = {
        where: dbWhere,
        limit: 1000,
        orderBy: { id: "asc" },
      };
      // populate 关系字段
      const dbPopulate: string[] = ["category", "tags", "cover", "thumbnail"];
      if (dbPopulate.length > 0) dbQueryParams.populate = dbPopulate;

      const allRows = await strapi.db.query(UID).findMany(dbQueryParams);

      // 按 document_id 去重，优先保留 draft 行（published_at IS NULL）
      const docMap = new Map<string, any>();
      for (const row of allRows) {
        const docId = row.documentId;
        const existing = docMap.get(docId);
        if (!existing) {
          docMap.set(docId, row);
        } else {
          // 已存在，优先保留 published_at IS NULL 的行
          const existingIsDraft = existing.publishedAt == null;
          const currentIsDraft = row.publishedAt == null;
          if (currentIsDraft && !existingIsDraft) {
            docMap.set(docId, row);
          }
        }
      }
      list = Array.from(docMap.values());
    } else {
      // 非 admin：保留原 documents API 查询逻辑（受 D&P 机制控制）
      const docParams: any = {
        filters: mergedFilters,
        status: publicOnly ? "published" : "draft",
        populate: {
          category: true,
          tags: true,
          cover: true,
          thumbnail: true,
          ...(populate || {}),
        },
      };
      if (sort) docParams.sort = sort;
      docParams.pagination = { page: 1, pageSize: 1000 };
      if (fields) docParams.fields = fields;
      if (locale) docParams.locale = locale;

      list = await strapi.documents(UID).findMany(docParams);
    }

    // 内存中过滤
    let filteredList = list;
    if (channelScope?.isGuest) {
      // 游客：mergedChannelIds 退化为 siteChannelIds（无 userChannelIds）
      const guestMergedIds = crossChannelEnabled ? siteChannelIds : siteChannelIds;
      filteredList = list.filter(course => {
        if (course.channelScope === "all") return true;
        if (course.channelScope === null) return true;
        if (crossChannelEnabled && course.channelScope === "specific" && course.allowCrossChannel === true) return true;
        if (course.channelScope === "specific") {
          const courseChannelIds = Array.isArray(course.channelIds) ? course.channelIds : [];
          return courseChannelIds.some(cid => guestMergedIds.some(mid => String(mid) === String(cid)));
        }
        return false;
      });
    } else if (channelScope && !channelScope.all) {
      // 登录用户：统一过滤公式
      // 1. channelScope=all → 可见
      // 2. crossChannelEnabled && allowCrossChannel=true → 可见
      // 3. specific && channelIds ∩ mergedChannelIds 非空 → 可见
      filteredList = list.filter(course => {
        if (course.channelScope === "all") return true;
        if (course.channelScope === null) return true;
        if (crossChannelEnabled && course.channelScope === "specific" && course.allowCrossChannel === true) return true;
        if (course.channelScope === "specific") {
          const courseChannelIds = Array.isArray(course.channelIds) ? course.channelIds : [];
          return courseChannelIds.some(cid => mergedChannelIds.some(mid => String(mid) === String(cid)));
        }
        return false;
      });
    }

    // 排序
    if (sort) {
      const sortField = typeof sort === "string" ? sort : Object.keys(sort)[0];
      const sortOrder = typeof sort === "string" ? "asc" : (sort[sortField] === "desc" ? "desc" : "asc");
      filteredList.sort((a: any, b: any) => {
        const av = a?.[sortField];
        const bv = b?.[sortField];
        if (av == null && bv == null) return 0;
        if (av == null) return sortOrder === "asc" ? -1 : 1;
        if (bv == null) return sortOrder === "asc" ? 1 : -1;
        if (av < bv) return sortOrder === "asc" ? -1 : 1;
        if (av > bv) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    const start = (page - 1) * pageSize;
    const paginatedList = filteredList.slice(start, start + pageSize);

    return {
      list: paginatedList,
      pagination: {
        page,
        pageSize,
        total: filteredList.length,
        pageCount: Math.ceil(filteredList.length / pageSize),
      },
    };
  },

  async findOne(documentId: string, publicOnly: boolean = false) {
    const params: any = {
      documentId,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true,
        pointChannel: true,
      },
    };
    if (publicOnly) {
      params.status = "published";
    }
    const result = await strapi.documents(UID).findOne(params);
    return result;
  },

  async create(data: any) {
    validateChannelConfig(data);
    
    // 转换 pointChannel 格式：数字 -> 对象格式
    if (data.pointChannel != null && typeof data.pointChannel !== 'object') {
      data.pointChannel = { id: data.pointChannel };
    }
    
    const cleaned = cleanDateFields(data);
    const needPublish = cleaned.status === "published";
    const result = await strapi.documents(UID).create({
      data: cleaned,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true,
      },
    });
    if (needPublish && result?.documentId) {
      const published = await publishDoc(result.documentId);
      await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(published));
      return published;
    }
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },

  async update(documentId: string, data: any) {
    validateChannelConfig(data);
    
    // 转换 pointChannel 格式：数字 -> 对象格式
    if (data.pointChannel != null && typeof data.pointChannel !== 'object') {
      data.pointChannel = { id: data.pointChannel };
    }
    
    // 验证 tags 中的 documentId 是否存在
    if (Array.isArray(data.tags) && data.tags.length > 0) {
      const tagIds = data.tags.map((t: any) => t.documentId || t.id).filter(Boolean);
      const existingTags = await strapi.documents("plugin::zhao-tag.tag").findMany({
        filters: { documentId: { $in: tagIds } },
        fields: ["documentId"],
      });
      const existingTagIds = new Set(existingTags.map((t: any) => t.documentId));
      const missingIds = tagIds.filter(id => !existingTagIds.has(id));
      if (missingIds.length > 0) {
        const err: any = new Error(`标签不存在: ${missingIds.join(', ')}`);
        err.code = "COURSE_002";
        err.status = 400;
        throw err;
      }
    }
    
    const cleaned = cleanDateFields(data);
    const needPublish = cleaned.status === "published";
    const result = await strapi.documents(UID).update({
      documentId,
      data: cleaned,
      populate: {
        category: true,
        tags: true,
        cover: true,
        thumbnail: true,
        lessons: true,
      },
    });
    if (needPublish && result?.documentId) {
      const published = await publishDoc(result.documentId);
      await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(published));
      return published;
    }
    await syncTagIndex(strapi, TARGET_TYPE, result.documentId, extractTagIds(result));
    return result;
  },

  async delete(documentId: string) {
    const result = await strapi.documents(UID).delete({ documentId });
    await removeTagIndex(strapi, TARGET_TYPE, documentId);
    return result;
  },

  async publish(documentId: string) {
    return publishDoc(documentId);
  },

  async unpublish(documentId: string) {
    return unpublishDoc(documentId);
  },
  };
};
