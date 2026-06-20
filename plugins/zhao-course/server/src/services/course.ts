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
        knowledgePoints: true,
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
        knowledgePoints: true,
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
  async find(query: any = {}, publicOnly: boolean = false, channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean }) {
    const { filters, populate, sort, pagination, fields, locale } = query;
    const mergedFilters: any = { ...filters };
    const userChannelIds = channelScope?.channelIds || [];

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

    const docParams: any = {
      filters: mergedFilters,
      status: publicOnly ? "published" : undefined, // 管理接口查询所有状态
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

    const [list] = await Promise.all([
      strapi.documents(UID).findMany(docParams),
    ]);

    // 内存中过滤
    let filteredList = list;
    if (channelScope?.isGuest) {
      // 游客：只显示 all 或 allowCrossChannel=true 的课程
      filteredList = list.filter(course => 
        course.channelScope === "all" || 
        course.channelScope === null || // 兼容旧数据
        (course.channelScope === "specific" && course.allowCrossChannel === true)
      );
    } else if (channelScope && !channelScope.all && userChannelIds.length > 0) {
      // 登录用户：过滤 channelIds
      filteredList = list.filter(course => {
        if (course.channelScope === "all") return true;
        if (course.channelScope === null) return true; // 兼容旧数据
        if (course.channelScope === "specific" && course.allowCrossChannel === true) return true;
        // 指定渠道且不允许跨渠道：检查用户渠道是否匹配
        const courseChannelIds = course.channelIds || [];
        return courseChannelIds.some(cid => userChannelIds.some(uid => String(uid) === String(cid)));
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
        knowledgePoints: true,
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
        knowledgePoints: true,
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
    
    // 验证 knowledgePoints 中的 documentId 是否存在
    if (Array.isArray(data.knowledgePoints) && data.knowledgePoints.length > 0) {
      const kpIds = data.knowledgePoints.map((kp: any) => kp.documentId || kp.id).filter(Boolean);
      const existingKps = await strapi.documents("plugin::zhao-tag.knowledge-point").findMany({
        filters: { documentId: { $in: kpIds } },
        fields: ["documentId"],
      });
      const existingKpIds = new Set(existingKps.map((kp: any) => kp.documentId));
      const missingIds = kpIds.filter(id => !existingKpIds.has(id));
      if (missingIds.length > 0) {
        const err: any = new Error(`知识点不存在: ${missingIds.join(', ')}`);
        err.code = "COURSE_002";
        err.status = 400;
        throw err;
      }
    }
    
    // 处理 knowledgePoints：如果是空数组，删除它以避免 Strapi 处理问题
    if (Array.isArray(data.knowledgePoints) && data.knowledgePoints.length === 0) {
      delete data.knowledgePoints;
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
        knowledgePoints: true,
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
