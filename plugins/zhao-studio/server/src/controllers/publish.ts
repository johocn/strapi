// server/src/controllers/publish.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listPlatforms(ctx: any) {
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const platforms = await publishService.listPlatforms();
    ctx.body = { data: platforms };
  },

  async createPlatform(ctx: any) {
    const { data } = ctx.request.body;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const platform = await publishService.createPlatform(data);
    ctx.body = { data: platform };
  },

  async updatePlatform(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const platform = await publishService.updatePlatform(id, data);
    ctx.body = { data: platform };
  },

  async deletePlatform(ctx: any) {
    const { id } = ctx.params;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    await publishService.deletePlatform(id);
    ctx.body = { data: { success: true } };
  },

  async listAccounts(ctx: any) {
    const { platformId } = ctx.query;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const accounts = await publishService.listAccounts(platformId);
    ctx.body = { data: accounts };
  },

  async createAccount(ctx: any) {
    const { data } = ctx.request.body;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const account = await publishService.createAccount(data);
    ctx.body = { data: account };
  },

  async updateAccount(ctx: any) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const account = await publishService.updateAccount(id, data);
    ctx.body = { data: account };
  },

  async deleteAccount(ctx: any) {
    const { id } = ctx.params;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    await publishService.deleteAccount(id);
    ctx.body = { data: { success: true } };
  },

  async publishArticle(ctx: any) {
    const { articleId } = ctx.params;
    const { accountIds } = ctx.request.body;

    const publishService = strapi.plugin('zhao-studio').service('publish');
    const results = await publishService.publishArticle(articleId, accountIds);

    ctx.body = { data: results };
  },

  async listRecords(ctx: any) {
    const { articleId, platformId, accountId } = ctx.query;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const records = await publishService.listRecords({ articleId, platformId, accountId });
    ctx.body = { data: records };
  },

  async retryPublish(ctx: any) {
    const { recordId } = ctx.params;
    const publishService = strapi.plugin('zhao-studio').service('publish');
    const result = await publishService.retryPublish(recordId);
    ctx.body = { data: result };
  },

  async syncStatus(ctx: any) {
    const { articleId } = ctx.params;
    const statusSync = strapi.plugin('zhao-studio').service('status-sync');
    await statusSync.syncPublishStatus(articleId);
    ctx.body = { data: { success: true } };
  },

  async findOne(ctx: any) {
    const record = await strapi
      .documents('plugin::zhao-studio.publish-record')
      .findOne({ documentId: ctx.params.id });
    ctx.body = { data: record };
  },

  async findOnePlatform(ctx: any) {
    const platform = await strapi
      .documents('plugin::zhao-studio.publish-platform')
      .findOne({ documentId: ctx.params.id });
    ctx.body = { data: platform };
  },

  async findOneAccount(ctx: any) {
    const account = await strapi
      .documents('plugin::zhao-studio.publish-account')
      .findOne({ documentId: ctx.params.id });
    ctx.body = { data: account };
  },

  // ============ P2 定时发布 ============
  async createSchedule(ctx: any) {
    try {
      const { articleId, accountIds, scheduledAt, name } = ctx.request.body;
      if (!scheduledAt) { ctx.throw(400, 'scheduledAt 必填'); return; }
      const schedTime = new Date(scheduledAt).getTime();
      if (isNaN(schedTime)) { ctx.throw(400, 'scheduledAt 格式无效'); return; }
      if (schedTime <= Date.now()) { ctx.throw(400, 'scheduledAt 必须晚于当前时间'); return; }
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const result = await publishService.createSchedule({ articleId, accountIds, scheduledAt, name });
      ctx.body = { data: result };
    } catch (e: any) { ctx.throw(400, e.message); }
  },

  async listSchedules(ctx: any) {
    try {
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const schedules = await publishService.listSchedules();
      ctx.body = { data: schedules };
    } catch (e: any) { ctx.throw(500, e.message); }
  },

  async findOneSchedule(ctx: any) {
    try {
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const schedule = await publishService.findOneSchedule(ctx.params.id);
      if (!schedule) return ctx.throw(404, '定时任务不存在');
      ctx.body = { data: schedule };
    } catch (e: any) { ctx.throw(400, e.message); }
  },

  async cancelSchedule(ctx: any) {
    try {
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const schedule = await publishService.cancelSchedule(ctx.params.id);
      ctx.body = { data: schedule };
    } catch (e: any) { ctx.throw(400, e.message); }
  },

  // ============ P3 基础补齐 ============
  async getDouyinSchema(ctx: any) {
    try {
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const result = await publishService.getDouyinSchema(ctx.params.recordId);
      ctx.body = { data: result };
    } catch (e: any) {
      if (e.message?.includes('不存在')) return ctx.throw(404, e.message);
      ctx.throw(400, e.message);
    }
  },

  async previewPublish(ctx: any) {
    try {
      const { articleId, accountIds } = ctx.request.body;
      const publishService = strapi.plugin('zhao-studio').service('publish');
      const result = await publishService.previewPublish(articleId, accountIds);
      ctx.body = { data: result };
    } catch (e: any) {
      if (e.message?.includes('不存在')) return ctx.throw(404, e.message);
      ctx.throw(400, e.message);
    }
  },
});