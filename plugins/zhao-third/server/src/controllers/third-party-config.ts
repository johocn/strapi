import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(ctx: any) {
    try {
      const configService = strapi.plugin("zhao-third").service("third-party-config");

      // 优先用 query.site（前端传入的租户 documentId）
      const siteParam = ctx.query?.site;

      if (siteParam) {
        // 用 knex 直接查关联表，避免 Strapi v5 Document Service manyToOne 过滤不稳定
        const result = await configService.findConfigsBySite(siteParam);
        ctx.body = result;
      } else {
        // 无 site 参数时返回全部（超级管理员场景）
        const result = await configService.findConfigs({});
        ctx.body = result;
      }
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 获取配置列表失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async create(ctx: any) {
    try {
      const {
        name, platform, appType, appId, appSecret,
        token, encodingAESKey, merchantId, enabled, site,
      } = ctx.request.body;

      if (!name || !platform || !appType || !appId || !appSecret) {
        ctx.status = 400;
        ctx.body = { error: "请提供 name, platform, appType, appId 和 appSecret" };
        return;
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");

      // 确定关联站点 documentId：优先 body.site，其次 ctx.state.siteDocumentId（site-resolver 设置）
      const siteDocumentId = site || ctx.state?.siteDocumentId;

      // 重复性校验：同一站点下同 platform+appType 不允许重复
      if (siteDocumentId) {
        const conflict = await configService.checkDuplicate(platform, appType, siteDocumentId);
        if (conflict) {
          ctx.status = 409;
          ctx.body = { error: `该租户下已存在 ${platform}/${appType} 配置（名称：${conflict.name}），请编辑现有配置而非重复添加` };
          return;
        }
      }

      // 只提取 schema 已声明的字段，避免传入未知字段导致验证失败
      const data: Record<string, any> = {
        name,
        platform,
        appType,
        appId,
        appSecret,
        enabled: enabled !== false,
      };
      // 可选字段仅在传值时写入（避免覆盖为 undefined）
      if (token !== undefined) data.token = token;
      if (encodingAESKey !== undefined) data.encodingAESKey = encodingAESKey;
      if (merchantId !== undefined) data.merchantId = merchantId;

      // Strapi v5 Document Service 关联用 documentId 设置
      if (siteDocumentId) {
        data.site = siteDocumentId;
      }

      const result = await configService.createConfig(data);
      ctx.status = 201;
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 创建配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async update(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }

      // 白名单过滤：只保留 schema 已声明的可写字段
      const allowedFields = [
        "name", "platform", "appType", "appId", "appSecret",
        "token", "encodingAESKey", "merchantId", "enabled", "site",
      ];
      const data: Record<string, any> = {};
      for (const key of allowedFields) {
        if (body[key] !== undefined) data[key] = body[key];
      }

      // 重复性校验：如果修改了 platform/appType，检查同站点下是否已有相同组合
      if (data.platform && data.appType) {
        const configService = strapi.plugin("zhao-third").service("third-party-config");
        const siteDocumentId = data.site || ctx.state?.siteDocumentId;
        if (siteDocumentId) {
          const conflict = await configService.checkDuplicate(data.platform, data.appType, siteDocumentId, documentId);
          if (conflict) {
            ctx.status = 409;
            ctx.body = { error: `该租户下已存在 ${data.platform}/${data.appType} 配置（名称：${conflict.name}）` };
            return;
          }
        }
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.updateConfig(documentId, data);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 更新配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },

  async delete(ctx: any) {
    try {
      const { documentId } = ctx.params;

      if (!documentId) {
        ctx.status = 400;
        ctx.body = { error: "请提供 documentId" };
        return;
      }

      const configService = strapi.plugin("zhao-third").service("third-party-config");
      const result = await configService.deleteConfig(documentId);
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error(`[zhao-third] 删除配置失败: ${error.message}`);
      ctx.status = error.status || 400;
      ctx.body = { error: error.message };
    }
  },
});
