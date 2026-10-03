"use strict";
// server/src/services/analytics.ts
Object.defineProperty(exports, "__esModule", { value: true });
const userAgentParser_1 = require("../utils/userAgentParser");
const ipLocationParser_1 = require("../utils/ipLocationParser");
exports.default = ({ strapi }) => ({
    async trackPageView(data) {
        // 解析浏览器信息
        const uaInfo = (0, userAgentParser_1.parseUserAgent)(data.userAgent);
        // 解析IP地理位置
        const ipInfo = await (0, ipLocationParser_1.parseIpLocation)(data.ip);
        // 提取referrer域名
        const referrerDomain = (0, ipLocationParser_1.extractReferrerDomain)(data.referrer);
        // 解析 promoChannelCode（通过 sessionId 查 SourceTag）
        let promoChannelCode = "";
        try {
            const tags = await strapi.documents("plugin::zhao-track.source-tag").findMany({
                filters: { tagId: data.sessionId },
                populate: { promoCampaign: { populate: { channel: true } } },
                limit: 1,
            });
            if (tags && tags.length > 0 && tags[0].promoCampaign?.channel) {
                promoChannelCode = tags[0].promoCampaign.channel.code || "";
            }
        }
        catch { /* 留空 */ }
        // 创建日志记录
        const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
            data: {
                eventType: 'page-view',
                article: data.articleId,
                sessionId: data.sessionId,
                userId: data.userId,
                isRegistered: !!data.userId,
                userAgent: data.userAgent,
                platform: uaInfo.platform,
                browser: uaInfo.browser,
                browserVersion: uaInfo.browserVersion,
                os: uaInfo.os,
                osVersion: uaInfo.osVersion,
                deviceType: uaInfo.deviceType,
                screenWidth: data.screen?.width,
                screenHeight: data.screen?.height,
                language: data.language,
                ip: data.ip,
                country: ipInfo.country,
                city: ipInfo.city,
                referrer: data.referrer,
                referrerDomain,
                promoChannelCode,
                timestamp: new Date(),
            },
        });
        return log;
    },
    async trackAdClick(data) {
        // 验证广告位
        const adSlot = await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .findOne({ documentId: data.adSlotId });
        if (!adSlot || !adSlot.isActive) {
            throw new Error('广告位不存在或已禁用');
        }
        // 解析浏览器信息
        const uaInfo = (0, userAgentParser_1.parseUserAgent)(data.userAgent);
        // 解析IP地理位置
        const ipInfo = await (0, ipLocationParser_1.parseIpLocation)(data.ip);
        // 解析 promoChannelCode（通过 sessionId 查 SourceTag）
        let promoChannelCode = "";
        try {
            const tags = await strapi.documents("plugin::zhao-track.source-tag").findMany({
                filters: { tagId: data.sessionId },
                populate: { promoCampaign: { populate: { channel: true } } },
                limit: 1,
            });
            if (tags && tags.length > 0 && tags[0].promoCampaign?.channel) {
                promoChannelCode = tags[0].promoCampaign.channel.code || "";
            }
        }
        catch { /* 留空 */ }
        // 创建日志记录
        const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
            data: {
                eventType: 'ad-click',
                article: data.articleId,
                adSlot: data.adSlotId,
                sessionId: data.sessionId,
                userId: data.userId,
                isRegistered: !!data.userId,
                userAgent: data.userAgent,
                platform: uaInfo.platform,
                browser: uaInfo.browser,
                browserVersion: uaInfo.browserVersion,
                os: uaInfo.os,
                osVersion: uaInfo.osVersion,
                deviceType: uaInfo.deviceType,
                ip: data.ip,
                country: ipInfo.country,
                city: ipInfo.city,
                promoChannelCode,
                timestamp: new Date(),
            },
        });
        return log;
    },
    async trackReadBehavior(data) {
        // 创建日志记录
        const log = await strapi.documents('plugin::zhao-studio.browser-log').create({
            data: {
                eventType: 'read-duration',
                article: data.articleId,
                sessionId: data.sessionId,
                readDuration: data.readDuration,
                scrollDepth: data.scrollDepth,
                timestamp: new Date(),
            },
        });
        return log;
    },
    async trackUserRegister(data) {
        // 更新该 sessionId 的所有日志记录
        const logs = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({
            filters: { sessionId: data.sessionId },
        });
        for (const log of logs) {
            await strapi.documents('plugin::zhao-studio.browser-log').update({
                documentId: log.documentId,
                data: {
                    userId: data.userId,
                    isRegistered: true,
                    registeredAt: data.registeredAt,
                },
            });
        }
        // 创建注册事件日志
        const registerLog = await strapi.documents('plugin::zhao-studio.browser-log').create({
            data: {
                eventType: 'user-register',
                sessionId: data.sessionId,
                userId: data.userId,
                isRegistered: true,
                registeredAt: data.registeredAt,
                timestamp: new Date(),
            },
        });
        return registerLog;
    },
    async listAdSlots() {
        const adSlots = await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .findMany();
        return adSlots;
    },
    async createAdSlot(data) {
        const adSlot = await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .create({ data });
        return adSlot;
    },
    async updateAdSlot(id, data) {
        const adSlot = await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .update({ documentId: id, data });
        return adSlot;
    },
    async deleteAdSlot(id) {
        await strapi
            .documents('plugin::zhao-studio.ad-slot')
            .delete({ documentId: id });
    },
    async getOverview(params) {
        const summaries = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({
            filters: {
                date: { $gte: params.startDate, $lte: params.endDate },
                summaryType: 'global-daily',
            },
        });
        // 计算汇总
        const totalPv = summaries.reduce((sum, s) => sum + (s.pv || 0), 0);
        const totalUv = summaries.reduce((sum, s) => sum + (s.uv || 0), 0);
        const totalClicks = summaries.reduce((sum, s) => sum + (s.clickCount || 0), 0);
        const avgReadDuration = summaries.length > 0
            ? summaries.reduce((sum, s) => sum + (s.avgReadDuration || 0), 0) / summaries.length
            : 0;
        return {
            pv: totalPv,
            uv: totalUv,
            clickCount: totalClicks,
            clickRate: totalPv > 0 ? (totalClicks / totalPv) * 100 : 0,
            avgReadDuration,
        };
    },
    async getArticleStats(params) {
        const filters = {
            date: { $gte: params.startDate, $lte: params.endDate },
            summaryType: 'article-daily',
        };
        if (params.articleId) {
            filters.article = params.articleId;
        }
        const summaries = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({ filters });
        return summaries;
    },
    async getAdSlotStats(params) {
        const filters = {
            date: { $gte: params.startDate, $lte: params.endDate },
            summaryType: 'ad-slot-daily',
        };
        if (params.adSlotId) {
            filters.adSlot = params.adSlotId;
        }
        const summaries = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({ filters });
        return summaries;
    },
    async getDeviceStats(params) {
        const summaries = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({
            filters: {
                date: { $gte: params.startDate, $lte: params.endDate },
                summaryType: 'device-daily',
            },
        });
        return summaries;
    },
    async getRegionStats(params) {
        const summaries = await strapi
            .documents('plugin::zhao-studio.stat-summary')
            .findMany({
            filters: {
                date: { $gte: params.startDate, $lte: params.endDate },
                summaryType: 'region-daily',
            },
        });
        return summaries;
    },
    async getUserStats(params) {
        // 查询注册用户日志
        const registerLogs = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({
            filters: {
                eventType: 'user-register',
                timestamp: { $gte: params.startDate, $lte: params.endDate },
            },
        });
        // 查询所有日志，计算注册用户占比
        const allLogs = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({
            filters: {
                eventType: 'page-view',
                timestamp: { $gte: params.startDate, $lte: params.endDate },
            },
        });
        const registeredCount = allLogs.filter((log) => log.isRegistered).length;
        const totalCount = allLogs.length;
        return {
            registerCount: registerLogs.length,
            registeredRatio: totalCount > 0 ? (registeredCount / totalCount) * 100 : 0,
        };
    },
    async cleanupOldLogs(days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const oldLogs = await strapi
            .documents('plugin::zhao-studio.browser-log')
            .findMany({
            filters: {
                timestamp: { $lt: cutoffDate },
            },
        });
        let deleted = 0;
        for (const log of oldLogs) {
            await strapi.documents('plugin::zhao-studio.browser-log').delete({
                documentId: log.documentId,
            });
            deleted++;
        }
        return { deleted };
    },
});
//# sourceMappingURL=analytics.js.map