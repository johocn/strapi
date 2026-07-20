import type { Core } from "@strapi/strapi";

export interface ChannelScope {
  all: boolean;
  channelIds: number[];
}

/**
 * 渠道范围服务（位于 zhao-auth）
 * 解析用户可见的渠道范围，供 has-channel-scope 策略和各插件调用
 *
 * 核心逻辑复用 zhao-channel 的 channel-permission.getUserAllChannels
 * （含 user-channel + role-channel + channel-member + path 下级扩展 + Redis 缓存）
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 解析用户可见渠道范围
   * @param user 用户对象（含 id, roles）
   * @returns ChannelScope
   */
  async resolve(user: any): Promise<ChannelScope> {
    const userRoles: string[] = Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : (Array.isArray(user.zhaoRoles) ? user.zhaoRoles : []);

    // admin 角色全渠道可见
    if (userRoles.includes("admin")) {
      return { all: true, channelIds: [] };
    }

    try {
      const channelPermService = strapi.plugin("zhao-channel").service("channel-permission");
      const channelIds = await channelPermService.getUserAllChannels(user.id);
      return { all: false, channelIds };
    } catch (err) {
      strapi.log.warn(`[zhao-auth:channel-scope] zhao-channel 服务不可用: ${(err as Error).message}`);
      return { all: false, channelIds: [] };
    }
  },

  /**
   * 构造 filters 中的 channel 过滤条件（纯函数，不调用 resolve）
   * @param scope 渠道范围（来自 ctx.state.channelScope）
   * @param field 关系字段名："channel"（manyToOne）/ "channels"（manyToMany）/ "id"（channel 自身）
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilter(scope: ChannelScope | undefined, field: string): Record<string, any> | null {
    if (!scope) return null;
    if (scope.all) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids;
    // field === "id" 表示过滤 channel 表自身的 id 字段，直接用 $in（不嵌套 id）
    // 其他字段是关系字段（channel/channels），需嵌套 id: { id: { $in: [...] } }
    if (field === "id") {
      return { id: { $in: idList } };
    }
    return { [field]: { id: { $in: idList } } };
  },

  /**
   * 校验单条记录的 channel 关系是否在 scope 内（纯函数）
   * @param scope 渠道范围
   * @param record 含 channel 关系的记录
   * @param field 关系字段名："channel"（对象）/ "channels"（数组）/ "id"（channel 自身，数字）
   * @throws 403 当记录的 channel 不在 scope 内
   */
  assertRecordInScope(scope: ChannelScope | undefined, record: any, field: string): void {
    if (!scope || scope.all) return;
    const rel = record?.[field];
    if (rel == null) return; // 无 channel 关联的旧数据放行

    const allowed = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    let recordChannelIds: number[] = [];
    if (Array.isArray(rel)) {
      // manyToMany: rel 是数组
      recordChannelIds = rel.map((c: any) => (typeof c === "number" ? c : c?.id)).filter((id: any) => typeof id === "number");
    } else if (typeof rel === "number") {
      // channel 自身字段（field="id"）或 db.query 返回的外键数字
      recordChannelIds = [rel];
    } else if (typeof rel === "object" && rel != null) {
      // manyToOne: rel 是对象
      if (typeof rel.id === "number") recordChannelIds = [rel.id];
    }

    if (recordChannelIds.length === 0) return; // 无法解析 channel id，放行
    const hasIntersection = recordChannelIds.some((id) => allowed.includes(id));
    if (!hasIntersection) {
      const e: any = new Error("无权访问该渠道的数据");
      e.status = 403;
      throw e;
    }
  },

  /**
   * 通过 channel documentId 校验是否在 scope 内（async，需查 DB）
   * @param scope 渠道范围
   * @param channelDocumentId channel 的 documentId
   * @throws 403 当 channel 不在 scope 内
   */
  async assertChannelDocIdInScope(scope: ChannelScope | undefined, channelDocumentId: string): Promise<void> {
    if (!scope || scope.all) return;
    if (!channelDocumentId) return;
    const channel = await strapi.db.query("plugin::zhao-channel.channel").findOne({
      where: { documentId: channelDocumentId },
      select: ["id"],
    });
    if (!channel) return; // channel 不存在，放行（由业务层处理 404）
    this.assertRecordInScope(scope, channel, "id");
  },

  /**
   * 构造嵌套关系过滤条件（纯函数，用于间接渠道关联）
   * @param scope 渠道范围
   * @param path 关系路径数组，如 ["course", "channel"] 生成 { course: { channel: { id: { $in: ids } } } }
   * @returns 过滤条件对象；null 表示不过滤
   */
  buildChannelFilterDeep(scope: ChannelScope | undefined, path: string[]): Record<string, any> | null {
    if (!scope) return null;
    if (scope.all) return null;
    if (!Array.isArray(path) || path.length === 0) return null;
    const ids = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const idList = ids.length === 0 ? [-1] : ids; // 非 admin 且无渠道授权：永假条件
    // 从内向外构造嵌套对象
    let filter: Record<string, any> = { id: { $in: idList } };
    for (let i = path.length - 1; i >= 0; i--) {
      filter = { [path[i]]: filter };
    }
    return filter;
  },
});
