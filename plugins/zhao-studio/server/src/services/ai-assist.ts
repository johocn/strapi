// server/src/services/ai-assist.ts

import axios from 'axios';
import { getProvider } from '../utils/aiProviders';
import { identifyAIErrorType } from '../utils/aiErrors';
import type { Core } from '@strapi/strapi';

interface AIConfig {
  enabled: boolean;
  provider: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async callAI(params: { prompt: string; type: string }) {
    const config = strapi.config.get('plugin.zhao-studio.ai') as AIConfig;

    if (!config?.enabled) {
      throw new Error('AI功能未启用');
    }

    const provider = getProvider(config.provider);
    if (!provider) {
      throw new Error('未知的AI服务提供商');
    }

    try {
      switch (config.provider) {
        case 'qwen':
          return await this.callQwen(params, config, provider);
        case 'wenxin':
          return await this.callWenxin(params, config, provider);
        case 'hunyuan':
          return await this.callHunyuan(params, config, provider);
        case 'spark':
          return await this.callSpark(params, config, provider);
        case 'custom':
          return await this.callCustom(params, config);
        default:
          throw new Error('未知的AI服务提供商');
      }
    } catch (error) {
      const errorType = identifyAIErrorType(error);
      throw new Error(errorType.message);
    }
  },

  async callQwen(params: { prompt: string; type: string }, config: any, provider: any) {
    const response = await axios.post(
      provider.endpoint,
      {
        model: config.model || provider.defaultModel,
        input: { prompt: params.prompt },
        parameters: {
          max_tokens: config.maxTokens || provider.maxTokens,
          temperature: config.temperature || provider.temperature,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.output?.text || '';
  },

  async callWenxin(params: { prompt: string; type: string }, config: any, provider: any) {
    // 百度文心一言API调用实现
    const response = await axios.post(
      `${provider.endpoint}?access_token=${config.apiKey}`,
      {
        model: config.model || provider.defaultModel,
        messages: [{ role: 'user', content: params.prompt }],
        max_tokens: config.maxTokens || provider.maxTokens,
        temperature: config.temperature || provider.temperature,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    return response.data.result || '';
  },

  async callHunyuan(params: { prompt: string; type: string }, config: any, provider: any) {
    // 腾讯混元API调用实现（需要签名）
    // 简化实现，实际需要腾讯云签名
    const response = await axios.post(
      provider.endpoint,
      {
        Query: params.prompt,
        Model: config.model || provider.defaultModel,
      },
      {
        headers: {
          'Authorization': config.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.Response?.Answer || '';
  },

  async callSpark(params: { prompt: string; type: string }, config: any, provider: any) {
    // 讯飞星火API调用实现（需要签名）
    // 简化实现，实际需要讯飞签名
    const response = await axios.post(
      provider.endpoint,
      {
        header: { app_id: config.apiKey },
        parameter: { chat: { domain: config.model || provider.defaultModel } },
        payload: { message: { text: [{ role: 'user', content: params.prompt }] } },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    return response.data.payload?.choices?.text?.[0]?.content || '';
  },

  async callCustom(params: { prompt: string; type: string }, config: any) {
    const response = await axios.post(
      config.endpoint,
      {
        prompt: params.prompt,
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.text || response.data.content || '';
  },

  async generateSummary(articleId: string, options?: { length?: number }) {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const summary = await this.callAI({
      prompt: `请为以下文章生成${options?.length || 150}字的摘要：\n\n${article.content}`,
      type: 'summary',
    });

    await strapi
      .documents('plugin::zhao-studio.article-draft')
      .update({
        documentId: articleId,
        data: { aiSummary: summary, aiProcessed: true } as any,
      });

    return summary;
  },

  async optimizeTitle(articleId: string, style: 'formal' | 'casual' | 'shocking') {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const styleMap = {
      formal: '正式',
      casual: '轻松',
      shocking: '震惊',
    };

    const optimizedTitle = await this.callAI({
      prompt: `请将以下标题优化为${styleMap[style]}风格，保持原意但增加吸引力：\n\n原标题：${article.title}`,
      type: 'title_optimize',
    });

    await strapi
      .documents('plugin::zhao-studio.article-draft')
      .update({
        documentId: articleId,
        data: { aiOptimizedTitle: optimizedTitle, aiProcessed: true } as any,
      });

    return optimizedTitle;
  },

  async rewriteContent(articleId: string, tone: 'formal' | 'casual' | 'humorous') {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const toneMap = {
      formal: '正式',
      casual: '轻松',
      humorous: '幽默',
    };

    const rewrittenContent = await this.callAI({
      prompt: `请将以下文章改写为${toneMap[tone]}语气，保持内容不变：\n\n${article.content}`,
      type: 'rewrite',
    });

    return rewrittenContent;
  },

  async convertLanguage(articleId: string, target: 'simplified' | 'traditional') {
    const article = await strapi
      .documents('plugin::zhao-studio.article-draft')
      .findOne({ documentId: articleId });

    if (!article) {
      throw new Error('文章不存在');
    }

    const targetMap = {
      simplified: '简体中文',
      traditional: '繁体中文',
    };

    const convertedContent = await this.callAI({
      prompt: `请将以下文章转换为${targetMap[target]}：\n\n${article.content}`,
      type: 'convert',
    });

    return convertedContent;
  },

  async chat(messages: Array<{ role: string; content: string }>) {
    const config = strapi.config.get('plugin.zhao-studio.ai') as AIConfig;

    if (!config?.enabled) {
      throw new Error('AI功能未启用');
    }

    // 将 messages 数组拼接为 prompt（最简实现，复用现有 callAI）
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemPrompt = systemMessages.map(m => m.content).join('\n');
    const conversationPrompt = conversationMessages
      .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n\n');

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${conversationPrompt}\n\n助手：`
      : `${conversationPrompt}\n\n助手：`;

    const content = await this.callAI({
      prompt: fullPrompt,
      type: 'chat',
    });

    return {
      content: content || '（无回复）',
      role: 'assistant',
    };
  },
});