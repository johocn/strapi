import type { Core } from "@strapi/strapi";

const ACCOUNT_UID = "plugin::zhao-third.third-party-account";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findByOpenId(platform: string, appType: string, openId: string) {
    return strapi.documents(ACCOUNT_UID).findFirst({
      filters: { platform, appType, openId },
      populate: { user: true },
    });
  },

  async findByUnionId(platform: string, unionId: string) {
    return strapi.documents(ACCOUNT_UID).findFirst({
      filters: { platform, unionId },
      populate: { user: true },
    });
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
