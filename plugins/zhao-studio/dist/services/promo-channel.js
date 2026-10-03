"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CHANNEL_UID = 'plugin::zhao-studio.promo-channel';
const CONFIG_UID = 'plugin::zhao-studio.channel-platform-config';
exports.default = ({ strapi }) => {
    const throwErr = (code, message) => {
        const err = new Error(message);
        err.code = code;
        throw err;
    };
    return {
        async listChannels(opts) {
            const filters = {};
            if (opts.scene)
                filters.scene = opts.scene;
            return strapi.documents(CHANNEL_UID).findMany({
                filters,
                start: (opts.page - 1) * opts.pageSize,
                limit: opts.pageSize,
                populate: { platformConfigs: true, campaigns: true },
            });
        },
        async getChannel(id) {
            const channels = await strapi.documents(CHANNEL_UID).findMany({
                filters: { documentId: id },
                populate: { platformConfigs: { populate: { platform: true } }, campaigns: true, coupons: true },
            });
            if (!channels || channels.length === 0) {
                throwErr('STUDIO_PROMO_CHANNEL_NOT_FOUND', '推广渠道不存在');
            }
            return channels[0];
        },
        async createChannel(data) {
            const existing = await strapi.documents(CHANNEL_UID).findMany({
                filters: { code: data.code },
            });
            if (existing && existing.length > 0) {
                throwErr('STUDIO_PROMO_CHANNEL_CODE_DUPLICATE', '渠道 code 重复');
            }
            return strapi.documents(CHANNEL_UID).create({ data: data });
        },
        async updateChannel(id, data) {
            return strapi.documents(CHANNEL_UID).update({ documentId: id, data: data });
        },
        async deleteChannel(id) {
            return strapi.documents(CHANNEL_UID).delete({ documentId: id });
        },
        async addPlatformConfig(channelId, data) {
            const existing = await strapi.documents(CONFIG_UID).findMany({
                filters: { channel: channelId, platform: data.platform },
            });
            if (existing && existing.length > 0) {
                throwErr('STUDIO_PROMO_PLATFORM_CONFIG_DUPLICATE', '渠道+平台配置重复');
            }
            return strapi.documents(CONFIG_UID).create({
                data: { channel: channelId, ...data },
            });
        },
        async updatePlatformConfig(configId, data) {
            return strapi.documents(CONFIG_UID).update({ documentId: configId, data: data });
        },
        async removePlatformConfig(configId) {
            return strapi.documents(CONFIG_UID).delete({ documentId: configId });
        },
    };
};
//# sourceMappingURL=promo-channel.js.map