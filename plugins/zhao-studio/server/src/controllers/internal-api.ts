// server/src/controllers/internal-api.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async listArticles(ctx: any) {
    const { channel, category, tag, page, pageSize } = ctx.query;

    const internalApiService = strapi.plugin('zhao-studio').service('internal-api');
    const articles = await internalApiService.listArticles({
      channel,
      category,
      tag,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });

    ctx.body = { data: articles };
  },

  async getArticle(ctx: any) {
    const { id } = ctx.params;

    const internalApiService = strapi.plugin('zhao-studio').service('internal-api');
    const article = await internalApiService.getArticle(id);

    ctx.body = { data: article };
  },

  async searchArticles(ctx: any) {
    const { q, page, pageSize } = ctx.query;

    if (!q) {
      ctx.body = { data: [] };
      return;
    }

    const internalApiService = strapi.plugin('zhao-studio').service('internal-api');
    const articles = await internalApiService.searchArticles(q, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });

    ctx.body = { data: articles };
  },

  async getCategories(ctx: any) {
    const internalApiService = strapi.plugin('zhao-studio').service('internal-api');
    const categories = await internalApiService.getCategories();

    ctx.body = { data: categories };
  },

  async getChannels(ctx: any) {
    const internalApiService = strapi.plugin('zhao-studio').service('internal-api');
    const channels = await internalApiService.getChannels();

    ctx.body = { data: channels };
  },
});