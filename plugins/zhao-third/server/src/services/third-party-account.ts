import type { Core } from "@strapi/strapi";

const ACCOUNT_UID = "plugin::zhao-third.third-party-account";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 按 openId 查找账号，优先返回「已绑定用户」的账号。
   *
   * 背景：早期脏数据可能遗留同一 openId 多条账号，其中旧账号 user 关联为空。
   * 若用 findFirst（按 id 顺序）恒兜住这条空关联账号，登录判定"未绑定"，
   * 导致同一 openId 每次登录都新建用户（微信 H5 反复重新登录、登录态无法持久）。
   * 这里改为拉取全部匹配项并优先取已绑用户的最新账号；全部为空关联时才回退首条。
   */
  async findByOpenId(platform: string, appType: string, openId: string) {
    const matches = await strapi.documents(ACCOUNT_UID).findMany({
      filters: { platform, appType, openId },
      sort: "id:asc",
      populate: { user: true },
    });
    const list = Array.isArray(matches) ? matches : [];
    // 优先已绑定用户的最晚账号（isNew 判定正确、登录身份稳定）
    return ([...list].reverse().find((a) => a.user) || list[0] || null) as any;
  },

  async findByUnionId(platform: string, unionId: string) {
    const matches = await strapi.documents(ACCOUNT_UID).findMany({
      filters: { platform, unionId },
      sort: "id:asc",
      populate: { user: true },
    });
    const list = Array.isArray(matches) ? matches : [];
    return ([...list].reverse().find((a) => a.user) || list[0] || null) as any;
  },

  async findByUser(userId: number | string) {
    return strapi.documents(ACCOUNT_UID).findMany({
      filters: { user: { id: userId } },
    });
  },

  async createAccount(data: Record<string, any>) {
    return strapi.documents(ACCOUNT_UID).create({ data });
  },

  async updateAccount(documentId: string, data: Record<string, any>) {
    return strapi.documents(ACCOUNT_UID).update({ documentId, data });
  },

  async findAccounts(filters: Record<string, any>) {
    return strapi.documents(ACCOUNT_UID).findMany({ filters, populate: { user: true } });
  },
});
