import type { Core } from '@strapi/strapi';

const CAMPAIGN_UID = 'plugin::zhao-studio.promo-campaign';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwErr = (code: string, message: string) => {
    const err: any = new Error(message);
    err.code = code;
    throw err;
  };

  return {
    async listCampaigns(opts: { page: number; pageSize: number; channelId?: string; status?: boolean }) {
      const filters: any = {};
      if (opts.channelId) filters.channel = opts.channelId;
      if (opts.status !== undefined) filters.status = opts.status;
      return strapi.documents(CAMPAIGN_UID).findMany({
        filters,
        start: (opts.page - 1) * opts.pageSize,
        limit: opts.pageSize,
        populate: { channel: true, experiments: true },
      });
    },

    async getCampaign(id: string) {
      const campaigns = await strapi.documents(CAMPAIGN_UID).findMany({
        filters: { documentId: id },
        populate: { channel: true, experiments: { populate: { variants: true } } },
      });
      if (!campaigns || campaigns.length === 0) {
        throwErr('STUDIO_PROMO_CAMPAIGN_NOT_FOUND', '营销活动不存在');
      }
      return campaigns[0];
    },

    async createCampaign(data: { name: string; code: string; channel: string; description?: string; startAt: string; endAt: string; status?: boolean; budget?: number; actualCost?: number }) {
      if (!data.channel) {
        throwErr('STUDIO_PROMO_CAMPAIGN_CHANNEL_REQUIRED', '活动必须关联渠道');
      }
      const existing = await strapi.documents(CAMPAIGN_UID).findMany({
        filters: { code: data.code },
      });
      if (existing && existing.length > 0) {
        throwErr('STUDIO_PROMO_CAMPAIGN_CODE_DUPLICATE', '活动 code 重复');
      }
      return strapi.documents(CAMPAIGN_UID).create({ data: data as any });
    },

    async updateCampaign(id: string, data: any) {
      return strapi.documents(CAMPAIGN_UID).update({ documentId: id, data: data as any });
    },

    async deleteCampaign(id: string) {
      return strapi.documents(CAMPAIGN_UID).delete({ documentId: id });
    },
  };
};
