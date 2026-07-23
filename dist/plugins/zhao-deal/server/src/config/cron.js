"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // 每小时检查是否到平台 syncCron 触发时间，命中则同步优惠券/产品候选
    "0 * * * *": async ({ strapi }) => {
        try {
            await strapi.plugin("zhao-deal").service("syncScheduler").run();
        }
        catch (err) {
            strapi.log.warn(`[zhao-deal cron] syncScheduler failed: ${err.message}`);
        }
    },
};
