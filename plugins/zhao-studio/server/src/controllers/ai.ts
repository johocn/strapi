// server/src/controllers/ai.ts

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getConfig(ctx: any) {
    const config = strapi.config.get('plugin.zhao-studio.ai');
    ctx.body = { data: config };
  },

  async updateConfig(ctx: any) {
    const { data } = ctx.request.body;
    ctx.body = { data: { success: true, config: data } };
  },

  async generateSummary(ctx: any) {
    const { articleId } = ctx.params;
    const { length } = ctx.query;

    const aiService = strapi.plugin('zhao-studio').service('ai-assist');
    const summary = await aiService.generateSummary(articleId, { length });

    ctx.body = { data: { summary } };
  },

  async optimizeTitle(ctx: any) {
    const { articleId } = ctx.params;
    const { style } = ctx.query;

    const aiService = strapi.plugin('zhao-studio').service('ai-assist');
    const optimizedTitle = await aiService.optimizeTitle(articleId, style);

    ctx.body = { data: { optimizedTitle } };
  },

  async rewriteContent(ctx: any) {
    const { articleId } = ctx.params;
    const { tone } = ctx.query;

    const aiService = strapi.plugin('zhao-studio').service('ai-assist');
    const rewrittenContent = await aiService.rewriteContent(articleId, tone);

    ctx.body = { data: { rewrittenContent } };
  },

  async convertLanguage(ctx: any) {
    const { articleId } = ctx.params;
    const { target } = ctx.query;

    const aiService = strapi.plugin('zhao-studio').service('ai-assist');
    const convertedContent = await aiService.convertLanguage(articleId, target);

    ctx.body = { data: { convertedContent } };
  },

  async testConnection(ctx: any) {
    const { provider, apiKey, endpoint } = ctx.request.body;

    try {
      const aiService = strapi.plugin('zhao-studio').service('ai-assist');
      const result = await aiService.callAI({
        prompt: '测试连接',
        type: 'test',
      });

      ctx.body = { data: { success: true, message: '连接成功' } };
    } catch (error: any) {
      ctx.body = { data: { success: false, message: error.message } };
    }
  },

  async chat(ctx: any) {
    const { messages } = ctx.request.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return ctx.badRequest('messages is required');
    }
    try {
      const aiService = strapi.plugin('zhao-studio').service('ai-assist');
      const result = await aiService.chat(messages);
      ctx.body = { data: result };
    } catch (error: any) {
      ctx.body = { data: { error: error.message } };
    }
  },
});