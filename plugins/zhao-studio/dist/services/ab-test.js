"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EXPERIMENT_UID = 'plugin::zhao-studio.ab-experiment';
const CLICK_EVENT_UID = 'plugin::zhao-track.click-event';
const ORDER_UID = 'plugin::zhao-track.order';
exports.default = ({ strapi }) => {
    const throwErr = (code, message) => {
        const err = new Error(message);
        err.code = code;
        throw err;
    };
    const pickByWeight = (variants) => {
        const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
        if (totalWeight <= 0)
            return variants[0];
        let random = Math.random() * totalWeight;
        for (const v of variants) {
            random -= (v.weight || 0);
            if (random <= 0)
                return v;
        }
        return variants[variants.length - 1];
    };
    const getExperiment = async (id) => {
        const experiments = await strapi.documents(EXPERIMENT_UID).findMany({
            filters: { documentId: id },
            populate: { variants: true, channel: true, campaign: true },
        });
        if (!experiments || experiments.length === 0) {
            throwErr('STUDIO_PROMO_EXPERIMENT_NOT_FOUND', 'A/B 实验不存在');
        }
        return experiments[0];
    };
    return {
        listExperiments: async (opts) => {
            const filters = {};
            if (opts.channelId)
                filters.channel = opts.channelId;
            if (opts.campaignId)
                filters.campaign = opts.campaignId;
            if (opts.status)
                filters.status = opts.status;
            return strapi.documents(EXPERIMENT_UID).findMany({
                filters,
                start: (opts.page - 1) * opts.pageSize,
                limit: opts.pageSize,
                populate: { variants: true, channel: true, campaign: true },
            });
        },
        getExperiment,
        createExperiment: async (data) => {
            if (!data.channel && !data.campaign) {
                throwErr('STUDIO_PROMO_EXPERIMENT_NOT_FOUND', '实验必须关联渠道或活动');
            }
            return strapi.documents(EXPERIMENT_UID).create({ data: data });
        },
        startExperiment: async (id) => {
            const exp = await getExperiment(id);
            if (exp.status !== 'draft' && exp.status !== 'paused') {
                throwErr('STUDIO_PROMO_EXPERIMENT_NOT_RUNNING', '实验当前状态不可启动');
            }
            return strapi.documents(EXPERIMENT_UID).update({
                documentId: id,
                data: { status: 'running', startAt: exp.startAt || new Date().toISOString() },
            });
        },
        stopExperiment: async (id) => {
            return strapi.documents(EXPERIMENT_UID).update({
                documentId: id,
                data: { status: 'paused' },
            });
        },
        pickVariant: async (opts) => {
            const filters = { status: 'running' };
            if (opts.campaignId)
                filters.campaign = opts.campaignId;
            if (opts.channelId)
                filters.channel = opts.channelId;
            const experiments = await strapi.documents(EXPERIMENT_UID).findMany({
                filters,
                populate: { variants: true },
                limit: 1,
            });
            if (!experiments || experiments.length === 0)
                return null;
            const exp = experiments[0];
            if (!exp.variants || exp.variants.length === 0) {
                throwErr('STUDIO_PROMO_EXPERIMENT_NO_VARIANTS', '实验无变体');
            }
            return pickByWeight(exp.variants);
        },
        getExperimentReport: async (experimentId, opts) => {
            const exp = await getExperiment(experimentId);
            const variantIds = (exp.variants || []).map((v) => v.documentId);
            const clicksByVariant = {};
            const ordersByVariant = {};
            for (const vid of variantIds) {
                const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
                    filters: {
                        abVariant: vid,
                        clickedAt: { $gte: opts.startDate, $lte: opts.endDate },
                    },
                });
                clicksByVariant[vid] = clicks ? clicks.length : 0;
                const orders = await strapi.documents(ORDER_UID).findMany({
                    filters: {
                        matchedClick: { abVariant: vid },
                        transactedAt: { $gte: opts.startDate, $lte: opts.endDate },
                    },
                });
                ordersByVariant[vid] = orders ? orders.length : 0;
            }
            return {
                experiment: { documentId: exp.documentId, name: exp.name, status: exp.status },
                variants: (exp.variants || []).map((v) => ({
                    documentId: v.documentId,
                    name: v.name,
                    weight: v.weight,
                    clicks: clicksByVariant[v.documentId] || 0,
                    orders: ordersByVariant[v.documentId] || 0,
                    conversionRate: clicksByVariant[v.documentId] > 0
                        ? Number(((ordersByVariant[v.documentId] || 0) / clicksByVariant[v.documentId] * 100).toFixed(2))
                        : 0,
                })),
            };
        },
    };
};
//# sourceMappingURL=ab-test.js.map