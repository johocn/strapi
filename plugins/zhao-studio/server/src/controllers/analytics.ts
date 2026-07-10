// server/src/controllers/analytics.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trackPageView(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackPageView(data);

    ctx.body = { data: log };
  },

  async trackAdClick(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackAdClick(data);

    ctx.body = { data: log };
  },

  async trackReadBehavior(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackReadBehavior(data);

    ctx.body = { data: log };
  },

  async trackUserRegister(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const log = await analyticsService.trackUserRegister(data);

    ctx.body = { data: log };
  },

  async listAdSlots(ctx: any) {
    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlots = await analyticsService.listAdSlots();

    ctx.body = { data: adSlots };
  },

  async createAdSlot(ctx: any) {
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlot = await analyticsService.createAdSlot(data);

    ctx.body = { data: adSlot };
  },

  async updateAdSlot(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const adSlot = await analyticsService.updateAdSlot(id, data);

    ctx.body = { data: adSlot };
  },

  async deleteAdSlot(ctx: any) {
    const { id } = ctx.params;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    await analyticsService.deleteAdSlot(id);

    ctx.body = { data: { success: true } };
  },

  async getOverview(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const overview = await analyticsService.getOverview({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: overview };
  },

  async getArticleStats(ctx: any) {
    const { articleId, startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getArticleStats({
      articleId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getAdSlotStats(ctx: any) {
    const { adSlotId, startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getAdSlotStats({
      adSlotId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getDeviceStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getDeviceStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getRegionStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getRegionStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async getUserStats(ctx: any) {
    const { startDate, endDate } = ctx.query;

    const analyticsService = strapi.plugin('zhao-studio').service('analytics');
    const stats = await analyticsService.getUserStats({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    ctx.body = { data: stats };
  },

  async findOneAdSlot(ctx: any) {
    const slot = await strapi
      .documents('plugin::zhao-studio.ad-slot')
      .findOne({ documentId: ctx.params.id });
    ctx.body = { data: slot };
  },
});