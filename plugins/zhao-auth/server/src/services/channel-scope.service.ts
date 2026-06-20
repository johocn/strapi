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
    const userRoles: string[] = Array.isArray(user.zhaoRoles) ? user.zhaoRoles : [];
    strapi.log.info(`[channel-scope:resolve] 用户 ${user.id}, zhaoRoles=${JSON.stringify(userRoles)}`);

    // admin 角色全渠道可见
    if (userRoles.includes("admin")) {
      strapi.log.info(`[channel-scope:resolve] 用户是 admin，返回全渠道`);
      return { all: true, channelIds: [] };
    }

    try {
      const channelPermService = strapi.plugin("zhao-channel").service("channel-permission");
      const channelIds = await channelPermService.getUserAllChannels(user.id);
      strapi.log.info(`[channel-scope:resolve] getUserAllChannels 返回: ${JSON.stringify(channelIds)}`);
      return { all: false, channelIds };
    } catch (err) {
      strapi.log.warn(`[zhao-auth:channel-scope] zhao-channel 服务不可用: ${(err as Error).message}`);
      return { all: false, channelIds: [] };
    }
  },
});
