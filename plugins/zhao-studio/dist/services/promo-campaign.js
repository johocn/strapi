"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CAMPAIGN_UID = 'plugin::zhao-studio.promo-campaign';
exports.default = ({ strapi }) => {
    const throwErr = (code, message) => {
        const err = new Error(message);
        err.code = code;
        throw err;
    };
    return {
        async listCampaigns(opts) {
            const filters = {};
            if (opts.channelId)
                filters.channel = opts.channelId;
            if (opts.status !== undefined)
                filters.status = opts.status;
            return strapi.documents(CAMPAIGN_UID).findMany({
                filters,
                start: (opts.page - 1) * opts.pageSize,
                limit: opts.pageSize,
                populate: { channel: true, experiments: true },
            });
        },
        async getCampaign(id) {
            const campaigns = await strapi.documents(CAMPAIGN_UID).findMany({
                filters: { documentId: id },
                populate: { channel: true, experiments: { populate: { variants: true } } },
            });
            if (!campaigns || campaigns.length === 0) {
                throwErr('STUDIO_PROMO_CAMPAIGN_NOT_FOUND', '营销活动不存在');
            }
            return campaigns[0];
        },
        async createCampaign(data) {
            if (!data.channel) {
                throwErr('STUDIO_PROMO_CAMPAIGN_CHANNEL_REQUIRED', '活动必须关联渠道');
            }
            const existing = await strapi.documents(CAMPAIGN_UID).findMany({
                filters: { code: data.code },
            });
            if (existing && existing.length > 0) {
                throwErr('STUDIO_PROMO_CAMPAIGN_CODE_DUPLICATE', '活动 code 重复');
            }
            return strapi.documents(CAMPAIGN_UID).create({ data: data });
        },
        async updateCampaign(id, data) {
            return strapi.documents(CAMPAIGN_UID).update({ documentId: id, data: data });
        },
        async deleteCampaign(id) {
            return strapi.documents(CAMPAIGN_UID).delete({ documentId: id });
        },
    };
};
//# sourceMappingURL=promo-campaign.js.map