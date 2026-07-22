import type { Core } from '@strapi/strapi';

const CHANNEL_UID = 'plugin::zhao-studio.promo-channel';
const CONFIG_UID = 'plugin::zhao-studio.channel-platform-config';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwErr = (code: string, message: string) => {
    const err: any = new Error(message);
    err.code = code;
    throw err;
  };

  return {
    async listChannels(opts: { page: number; pageSize: number; scene?: string }) {
      const filters: any = {};
      if (opts.scene) filters.scene = opts.scene;
      return strapi.documents(CHANNEL_UID).findMany({
        filters,
        start: (opts.page - 1) * opts.pageSize,
        limit: opts.pageSize,
        populate: { platformConfigs: true, campaigns: true },
      });
    },

    async getChannel(id: string) {
      const channels = await strapi.documents(CHANNEL_UID).findMany({
        filters: { documentId: id },
        populate: { platformConfigs: { populate: { platform: true } }, campaigns: true, coupons: true },
      });
      if (!channels || channels.length === 0) {
        throwErr('STUDIO_PROMO_CHANNEL_NOT_FOUND', '推广渠道不存在');
      }
      return channels[0];
    },

    async createChannel(data: { name: string; code: string; description?: string; scene?: string; budget?: number; actualCost?: number }) {
      const existing = await strapi.documents(CHANNEL_UID).findMany({
        filters: { code: data.code },
      });
      if (existing && existing.length > 0) {
        throwErr('STUDIO_PROMO_CHANNEL_CODE_DUPLICATE', '渠道 code 重复');
      }
      return strapi.documents(CHANNEL_UID).create({ data: data as any });
    },

    async updateChannel(id: string, data: any) {
      return strapi.documents(CHANNEL_UID).update({ documentId: id, data: data as any });
    },

    async deleteChannel(id: string) {
      return strapi.documents(CHANNEL_UID).delete({ documentId: id });
    },

    async addPlatformConfig(channelId: string, data: { platform: string; promoPid?: string; promoLink?: string; isActive?: boolean }) {
      const existing = await strapi.documents(CONFIG_UID).findMany({
        filters: { channel: channelId, platform: data.platform },
      });
      if (existing && existing.length > 0) {
        throwErr('STUDIO_PROMO_PLATFORM_CONFIG_DUPLICATE', '渠道+平台配置重复');
      }
      return strapi.documents(CONFIG_UID).create({
        data: { channel: channelId, ...data } as any,
      });
    },

    async updatePlatformConfig(configId: string, data: any) {
      return strapi.documents(CONFIG_UID).update({ documentId: configId, data: data as any });
    },

    async removePlatformConfig(configId: string) {
      return strapi.documents(CONFIG_UID).delete({ documentId: configId });
    },
  };
};
