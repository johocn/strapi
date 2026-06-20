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
    channelScope?: { all: boolean; channelIds: number[]; isGuest?: boolean }
  ) {
    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 25;
    const userChannelIds = channelScope?.channelIds || [];

    // 先获取所有数据
    const [list] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        sort: [{ sort: "asc" }],
        pagination: { page: 1, pageSize: 1000 },
      }),
    ]);

    // 内存中过滤：根据用户类型和渠道权限
    let filteredList = list;
    // 如果没有 channelScope 或 channelScope 无效，按游客处理
    const isGuest = !channelScope || channelScope.isGuest || (!channelScope.all && !channelScope.channelIds?.length);
    if (!channelScope?.all) {
      filteredList = list.filter((category: any) => {
        // 全渠道分类：所有人可见
        if (category.channelScope === "all") return true;
        // 兼容旧数据：无渠道配置的分类可见
        if (category.channelScope === null) return true;
        
        // 指定渠道分类
        if (category.channelScope === "specific") {
          // 游客：只显示允许跨渠道访问的分类
          if (isGuest) {
            return category.allowCrossChannel === true;
          }
          // 登录用户：检查渠道权限
          const categoryChannelIds = category.channelIds || [];
          return categoryChannelIds.some((cid: any) =>
            userChannelIds.some((uid: any) => String(uid) === String(cid))
          );
        }
        return true;
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
