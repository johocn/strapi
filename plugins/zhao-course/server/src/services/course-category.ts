import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-course.course-category";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 查询分类列表（支持渠道过滤和分页）
   * @param query - 查询参数，支持 pagination, filters, sort, fields, populate
   * @param channelScope - 渠道范围，包含 isGuest 标识游客
   */
  async find(
    query: {
      pagination?: { page?: number; pageSize?: number };
      filters?: Record<string, any>;
      sort?: string | Record<string, "asc" | "desc"> | Array<string | Record<string, "asc" | "desc">>;
      fields?: string[];
      populate?: any;
    } = {},
    ctxState?: {
      channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean };
      mergedChannelIds: number[];
      siteChannelIds: number[];
      crossChannelEnabled: boolean;
    }
  ) {
    const channelScope = ctxState?.channelScope;
    const mergedChannelIds = ctxState?.mergedChannelIds || [];
    const siteChannelIds = ctxState?.siteChannelIds || [];
    const crossChannelEnabled = ctxState?.crossChannelEnabled ?? true;
    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 25;

    // 先获取所有数据
    const [list] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        sort: [{ sort: "asc" }],
        pagination: { page: 1, pageSize: 1000 },
      }),
    ]);

    // 内存中过滤：统一公式
    let filteredList = list;
    const isGuest = !channelScope || channelScope.isGuest === true
      || (!channelScope.all && !(channelScope.channelIds?.length));
    if (!channelScope?.all) {
      // mergedChannelIds 计算：游客退化为 siteChannelIds
      const effectiveMergedIds = isGuest ? siteChannelIds : mergedChannelIds;
      filteredList = list.filter((category: any) => {
        if (category.channelScope === "all") return true;
        if (category.channelScope === null) return true;
        if (category.channelScope === "specific") {
          if (crossChannelEnabled && category.allowCrossChannel === true) return true;
          const categoryChannelIds = category.channelIds || [];
          return categoryChannelIds.some((cid: any) =>
            effectiveMergedIds.some((mid: number) => String(mid) === String(cid))
          );
        }
        return false;
      });
    }

    // 分页
    const start = (page - 1) * pageSize;
    const paginatedList = filteredList.slice(start, start + pageSize);

    return {
      list: paginatedList,
      pagination: { page, pageSize, total: filteredList.length, pageCount: Math.ceil(filteredList.length / pageSize) },
    };
  },

  async findOne(documentId: string, params: { fields?: string[]; populate?: any } = {}) {
    return strapi.documents(UID).findOne({ documentId, ...params });
  },

  async create(data: Record<string, any>) {
    return strapi.documents(UID).create({ data });
  },

  async update(documentId: string, data: Record<string, any>) {
    return strapi.documents(UID).update({ documentId, data });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },
});
