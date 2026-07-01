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
});