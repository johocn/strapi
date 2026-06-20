import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getUserId = (ctx: any) => ctx.state.user.id || ctx.state.user.documentId;

  return ({
  // ===== 积分类型 CRUD =====

  async findTypes(ctx: any) {
    try {
      const { enabled } = ctx.query;
      const filters: any = {};
      if (enabled !== undefined) filters.enabled = enabled === "true";
      const configService = strapi.plugin("zhao-point").service("config-service");
      ctx.body = await configService.findTypes(filters);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async findOneType(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const configService = strapi.plugin("zhao-point").service("config-service");
      const type = await configService.findOneType(documentId);
      if (!type) { ctx.status = 404; ctx.body = { error: "积分类型不存在" }; return; }
      ctx.body = type;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async createType(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const configService = strapi.plugin("zhao-point").service("config-service");
      ctx.body = await configService.createType(body);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async updateType(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const configService = strapi.plugin("zhao-point").service("config-service");
      ctx.body = await configService.updateType(documentId, body);
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async deleteType(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const configService = strapi.plugin("zhao-point").service("config-service");
      await configService.deleteType(documentId);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 积分规则 CRUD =====

  // GET /point-rules
  async findRules(ctx: any) {
    try {
      const { action, category, enabled } = ctx.query;
      const rules = await strapi.plugin("zhao-point").service("point").getRules({
        action, category, enabled: enabled !== undefined ? enabled === "true" : undefined,
      });
      ctx.body = rules;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /point-rules/:documentId
  async findOneRule(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const rule = await strapi.db.query("plugin::zhao-point.point-rule").findOne({
        where: { documentId },
      });
      if (!rule) { ctx.status = 404; ctx.body = { error: "规则不存在" }; return; }
      ctx.body = rule;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /point-rules
  async createRule(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const rule = await strapi.plugin("zhao-point").service("point").upsertRule(body);
      ctx.body = rule;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // PUT /point-rules/:documentId
  async updateRule(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      // 先查 documentId 对应的 action
      const existing = await strapi.db.query("plugin::zhao-point.point-rule").findOne({
        where: { documentId },
      });
      if (!existing) { ctx.status = 404; ctx.body = { error: "规则不存在" }; return; }
      const rule = await strapi.plugin("zhao-point").service("point").upsertRule({
        action: existing.action,
        ...body,
      });
      ctx.body = rule;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // DELETE /point-rules/:documentId
  async deleteRule(ctx: any) {
    try {
      const { documentId } = ctx.params;
      await strapi.plugin("zhao-point").service("point").deleteRule(documentId);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /point-rules/batch-enable
  async batchEnableRules(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { actions, enabled } = body;
      const result = await strapi.plugin("zhao-point").service("rule-engine").batchEnableActions(actions, enabled);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 规则模板 CRUD =====

  // GET /rule-templates
  async findTemplates(ctx: any) {
    try {
      const { category, enabled } = ctx.query;
      const templates = await strapi.plugin("zhao-point").service("rule-engine").getTemplates({
        category,
        enabled: enabled !== undefined ? enabled === "true" : undefined,
      });
      ctx.body = templates;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /rule-templates
  async createTemplate(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const template = await strapi.plugin("zhao-point").service("rule-engine").createTemplate(body);
      ctx.body = template;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // PUT /rule-templates/:documentId
  async updateTemplate(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const template = await strapi.plugin("zhao-point").service("rule-engine").updateTemplate(documentId, body);
      ctx.body = template;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // DELETE /rule-templates/:documentId
  async deleteTemplate(ctx: any) {
    try {
      const { documentId } = ctx.params;
      await strapi.plugin("zhao-point").service("rule-engine").deleteTemplate(documentId);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /rule-templates/:documentId/apply
  async applyTemplate(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { targetAction } = body;
      const rule = await strapi.plugin("zhao-point").service("rule-engine").applyTemplate(documentId, targetAction);
      ctx.body = rule;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 积分记录管理 =====

  // GET /point-records
  async findRecords(ctx: any) {
    try {
      const { page = "1", pageSize = "20", userId, action, type, startDate, endDate } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("point").listRecords({
        userId, action, type, startDate, endDate,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /point-records/:documentId
  async findOneRecord(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const record = await strapi.plugin("zhao-point").service("point").findRecordByDocumentId(documentId);
      if (!record) { ctx.status = 404; ctx.body = { error: "记录不存在" }; return; }
      ctx.body = record;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /point-records/admin-adjust
  async adminAdjust(ctx: any) {
    try {
      const operatorId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { userId, points, action, remark } = body;
      const record = await strapi.plugin("zhao-point").service("point").adminAdjust({
        userId, points, action, remark, operatorId,
      });
      ctx.body = record;
    } catch (e: any) {
      ctx.status = e.code === "POINT_002" ? 400 : 500; ctx.body = { error: e.message }; return;
    }
  },

  // POST /point-records/batch-adjust
  async batchAdjust(ctx: any) {
    try {
      const operatorId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { adjustments } = body;
      const result = await strapi.plugin("zhao-point").service("point").batchAdjust(adjustments, operatorId);
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /point-records/statistics
  async getRecordStats(ctx: any) {
    try {
      const { userId } = ctx.query;
      if (userId) {
        const stats = await strapi.plugin("zhao-point").service("point").getStatistics(userId);
        ctx.body = stats;
      } else {
        ctx.body = { message: "请指定用户ID" };
      }
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 兑换审核 =====

  // GET /point-redemptions
  async findRedemptions(ctx: any) {
    try {
      const { page = "1", pageSize = "20", status, userId, deliveryType, startDate, endDate } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("redemption").getRedemptions({
        status, userId, deliveryType,
        page: parseInt(page), pageSize: parseInt(pageSize),
        startDate, endDate,
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /point-redemptions/:documentId
  async findOneRedemption(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const record = await strapi.plugin("zhao-point").service("redemption").getRedemption(documentId);
      if (!record) { ctx.status = 404; ctx.body = { error: "兑换记录不存在" }; return; }
      ctx.body = record;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // PUT /point-redemptions/:documentId
  async updateRedemption(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const operatorId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { status, expressCompany, trackingNumber } = body;
      const result = await strapi.plugin("zhao-point").service("redemption").reviewRedemption(
        documentId, status, operatorId, { expressCompany, trackingNumber }
      );
      ctx.body = result;
    } catch (e: any) {
      ctx.status = e.code === "POINT_006" || e.code === "POINT_016" ? 400 : 500; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 商品管理 =====

  // GET /products
  async findProducts(ctx: any) {
    try {
      const { status, deliveryType, name, page = "1", pageSize = "20" } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("redemption").getProducts({
        status, deliveryType, name,
        page: parseInt(page), pageSize: parseInt(pageSize),
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /products/:documentId
  async findOneProduct(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const product = await strapi.plugin("zhao-point").service("redemption").getProduct(documentId);
      if (!product) { ctx.status = 404; ctx.body = { error: "商品不存在" }; return; }
      ctx.body = product;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /products
  async createProduct(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const product = await strapi.plugin("zhao-point").service("redemption").createProduct(body);
      ctx.body = product;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // PUT /products/:documentId
  async updateProduct(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const product = await strapi.plugin("zhao-point").service("redemption").updateProduct(documentId, body);
      ctx.body = product;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // DELETE /products/:documentId
  async deleteProduct(ctx: any) {
    try {
      const { documentId } = ctx.params;
      await strapi.plugin("zhao-point").service("redemption").deleteProduct(documentId);
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // POST /products/:documentId/stock
  async adjustStock(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const { delta } = body;
      const product = await strapi.plugin("zhao-point").service("redemption").adjustStock(documentId, delta);
      ctx.body = product;
    } catch (e: any) {
      ctx.status = e.code === "POINT_013" || e.code === "POINT_014" ? 400 : 500; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 自提点 CRUD =====

  async findPickupLocations(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const { status, page, pageSize } = ctx.query;
      const where: any = { deletedAt: null };
      if (status) where.status = status;
      const [records, total] = await Promise.all([
        strapi.db.query(LOCATION_UID).findMany({
          where,
          orderBy: { sortOrder: "asc" },
          offset: ((page ? parseInt(page) : 1) - 1) * (pageSize ? parseInt(pageSize) : 20),
          limit: pageSize ? parseInt(pageSize) : 20,
          populate: { coverImage: true, businessLicense: true, channels: { select: ['id', 'documentId', 'name'] } },
        }),
        strapi.db.query(LOCATION_UID).count({ where }),
      ]);
      ctx.body = { data: records, meta: { pagination: { page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 20, total } } };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async findOnePickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const { documentId } = ctx.params;
      const location = await strapi.db.query(LOCATION_UID).findOne({
        where: { documentId, deletedAt: null },
        populate: { coverImage: true, businessLicense: true, channels: { select: ['id', 'documentId', 'name'] } },
      });
      if (!location) { ctx.status = 404; ctx.body = { error: "自提点不存在" }; return; }
      ctx.body = { data: location };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async createPickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const body = ctx.request.body?.data || ctx.request.body;
      const data = { ...body };
      // 解析 channels：documentId 转为数字 id
      if (Array.isArray(data.channels) && data.channels.length > 0) {
        const channelIds = await Promise.all(
          data.channels.map(async (chId: string) => {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
              select: ['id'],
            });
            return ch?.id;
          })
        );
        data.channels = channelIds.filter(Boolean);
      }
      // 解析 coverImage / businessLicense：可能是文件 id 或 media 对象
      if (data.coverImage && typeof data.coverImage !== 'number') data.coverImage = Number(data.coverImage) || undefined;
      if (data.businessLicense && typeof data.businessLicense !== 'number') data.businessLicense = Number(data.businessLicense) || undefined;
      const location = await strapi.db.query(LOCATION_UID).create({ data });
      ctx.body = { data: location };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async updatePickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const { documentId } = ctx.params;
      const body = ctx.request.body?.data || ctx.request.body;
      const data = { ...body };
      // 解析 channels：documentId 转为数字 id
      if (Array.isArray(data.channels) && data.channels.length > 0) {
        const channelIds = await Promise.all(
          data.channels.map(async (chId: string) => {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
              select: ['id'],
            });
            return ch?.id;
          })
        );
        data.channels = channelIds.filter(Boolean);
      }
      if (data.coverImage && typeof data.coverImage !== 'number') data.coverImage = Number(data.coverImage) || undefined;
      if (data.businessLicense && typeof data.businessLicense !== 'number') data.businessLicense = Number(data.businessLicense) || undefined;
      const location = await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data });
      ctx.body = { data: location };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  async deletePickupLocation(ctx: any) {
    try {
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const { documentId } = ctx.params;
      await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data: { deletedAt: new Date() } });
      ctx.body = { success: true };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 系统配置 =====

  // GET /config
  async getConfig(ctx: any) {
    try {
      const config = await strapi.plugin("zhao-point").service("config-service").getConfig();
      ctx.body = config;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // PUT /config
  async updateConfig(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const config = await strapi.plugin("zhao-point").service("config-service").updateConfig(body);
      ctx.body = config;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 核销管理 =====

  // GET /verifications
  async findVerifications(ctx: any) {
    try {
      const { page = "1", pageSize = "20", verifierId, verifiedUserId, channelId, direction, status, method, startDate, endDate } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("verification").getVerificationLog({
        verifierId, verifiedUserId, channelId, direction, status, method, startDate, endDate,
        page: parseInt(page), pageSize: parseInt(pageSize),
      });
      ctx.body = result;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /verifications/:documentId
  async findOneVerification(ctx: any) {
    try {
      const { documentId } = ctx.params;
      const record = await strapi.plugin("zhao-point").service("point").findVerificationByDocumentId(documentId);
      if (!record) { ctx.status = 404; ctx.body = { error: "核销记录不存在" }; return; }
      ctx.body = record;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // GET /verifications/stats
  async getVerificationStats(ctx: any) {
    try {
      const { channelId } = ctx.query;
      const stats = await strapi.plugin("zhao-point").service("verification").getVerificationStats(channelId);
      ctx.body = stats;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 签到记录 =====

  // GET /sign-in-records
  async findSignInRecords(ctx: any) {
    try {
      const { page = "1", pageSize = "20", userId } = ctx.query;
      const SIGN_IN_UID = "plugin::zhao-point.sign-in-record";
      const where: any = {};
      if (userId) where.user = userId;

      const [records, total] = await Promise.all([
        strapi.db.query(SIGN_IN_UID).findMany({
          where,
          orderBy: { signInDate: "desc" },
          offset: (parseInt(page) - 1) * parseInt(pageSize),
          limit: parseInt(pageSize),
          populate: { user: { select: ["id"] } },
        }),
        strapi.db.query(SIGN_IN_UID).count({ where }),
      ]);

      ctx.body = {
        results: records,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pageCount: Math.ceil(total / parseInt(pageSize)),
        },
      };
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },

  // ===== 仪表盘 =====

  // GET /dashboard
  async getDashboard(ctx: any) {
    try {
      const stats = await strapi.plugin("zhao-point").service("config-service").getDashboardStats();
      ctx.body = stats;
    } catch (e: any) {
      ctx.status = (e as any).status || 400; ctx.body = { error: e.message }; return;
    }
  },
  });
};
