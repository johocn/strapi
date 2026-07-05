import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const wrapList = (result: any) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const getUserId = (ctx: any) => ctx.state.user.id || ctx.state.user.documentId;

  return ({
  async earn(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { action, source, method, remark, orderId, channelId } = body;
      const record = await strapi.plugin("zhao-point").service("point").earnPoints({
        userId, action, source, method, remark, orderId, channelId,
      });
      ctx.body = wrap(record);
    } catch (e: any) {
      const status = e.code === "POINT_001" || e.code === "POINT_004" || e.code === "POINT_011" || e.code === "POINT_019" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async deduct(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { action, points, source, method, remark, orderId } = body;
      const record = await strapi.plugin("zhao-point").service("point").deductPoints({
        userId, action, points, source, method, remark, orderId,
      });
      ctx.body = wrap(record);
    } catch (e: any) {
      const status = e.code === "POINT_002" || e.code === "POINT_010" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async balance(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await strapi.plugin("zhao-point").service("point").getBalance(userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async records(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { page, pageSize, action, type, startDate, endDate } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("point").getRecords(userId, {
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
        action, type, startDate, endDate,
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async statistics(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await strapi.plugin("zhao-point").service("point").getStatistics(userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async redeem(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { productId, itemName, pointsCost, quantity, deliveryType, pickupLocationId, receiverName, receiverPhone, receiverAddress, remark, useGlobalPoints, selectedChannels } = body;
      const result = await strapi.plugin("zhao-point").service("redemption").createRedemption({
        userId, productId, itemName, pointsCost, quantity, deliveryType, pickupLocationId,
        receiverName, receiverPhone, receiverAddress, remark, useGlobalPoints, selectedChannels,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      const status = e.code === "POINT_005" || e.code === "POINT_013" || e.code === "POINT_014" || e.code === "POINT_015" || e.code === "POINT_021" || e.code === "POINT_022" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async redeemRecords(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { status, page, pageSize } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("redemption").getUserRedemptions(userId, {
        status,
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async verifyPickup(ctx: any) {
    try {
      const operatorId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { pickupCode } = body;
      const result = await strapi.plugin("zhao-point").service("redemption").verifyRedemption(pickupCode, operatorId);
      ctx.body = wrap(result);
    } catch (e: any) {
      const status = e.code === "POINT_020" || e.code === "POINT_023" || e.code === "POINT_025" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async rules(ctx: any) {
    try {
      const { action, category } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("point").getRules({ action, category });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async listProducts(ctx: any) {
    try {
      const userId = ctx.state.user?.id;
      const siteId = ctx.state?.siteId;
      const { status, deliveryType, page, pageSize } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("redemption").getProducts({
        status: status || "on_shelf",
        deliveryType,
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
        userId,
        siteId,
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getProduct(ctx: any) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;
      const product = await strapi.plugin("zhao-point").service("redemption").getProduct(id, userId);
      if (!product) {
        ctx.status = 404;
        ctx.body = { error: "商品不存在" };
        return;
      }
      ctx.body = wrap(product);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async listPickupLocations(ctx: any) {
    try {
      const { channelId, status, page, pageSize } = ctx.query;
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const where: any = { deletedAt: null };
      if (status) where.status = status;
      else where.status = "active";
      if (channelId) {
        // channelId 可能是 documentId，需转为数字 id
        const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
          where: {
            $or: [
              { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
              { documentId: String(channelId) },
            ],
          },
          select: ['id'],
        });
        if (ch) where.channels = ch.id;
        else where.channels = -1; // 无匹配，返回空
      }

      const [records, total] = await Promise.all([
        strapi.db.query(LOCATION_UID).findMany({
          where,
          orderBy: { sortOrder: "asc" },
          offset: ((page ? parseInt(page) : 1) - 1) * (pageSize ? parseInt(pageSize) : 50),
          limit: pageSize ? parseInt(pageSize) : 50,
          populate: { coverImage: true, businessLicense: true },
        }),
        strapi.db.query(LOCATION_UID).count({ where }),
      ]);
      ctx.body = wrapList({ records, total, page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 50 });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getPickupLocation(ctx: any) {
    try {
      const { id } = ctx.params;
      const LOCATION_UID = "plugin::zhao-point.pickup-location";
      const where: any = { deletedAt: null };
      // id 可能是 documentId
      if (typeof id === 'string' && isNaN(Number(id))) {
        where.documentId = id;
      } else {
        where.id = id;
      }
      const location = await strapi.db.query(LOCATION_UID).findOne({
        where,
        populate: { coverImage: true, businessLicense: true, channels: { select: ['id', 'documentId', 'name'] } },
      });
      if (!location) {
        ctx.status = 404;
        ctx.body = { error: "自提点不存在" };
        return;
      }
      ctx.body = wrap(location);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async generateQRCode(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { channelId, direction } = body;
      const result = await strapi.plugin("zhao-point").service("verification").generateQRCode({
        verifierId: userId, channelId, direction,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async verifyByQRCode(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { token, location } = body;
      const result = await strapi.plugin("zhao-point").service("verification").verifyByQRCode({
        token, verifiedUserId: userId, location,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      const status = e.code === "POINT_017" || e.code === "POINT_018" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async manualVerify(ctx: any) {
    try {
      const verifierId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body;
      const { verifiedUserId, channelId, direction, remark } = body;
      const result = await strapi.plugin("zhao-point").service("verification").manualVerify({
        verifierId, verifiedUserId, channelId, direction, remark,
      });
      ctx.body = wrap(result);
    } catch (e: any) {
      const status = e.code === "POINT_018" ? 400 : 500;
      ctx.status = status;
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async getMyVerifications(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { direction, status, page, pageSize } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("verification").getVerificationLog({
        verifierId: userId,
        direction, status,
        page: page ? parseInt(page) : undefined,
        pageSize: pageSize ? parseInt(pageSize) : undefined,
      });
      ctx.body = wrapList(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getEligibleActions(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { channelId } = ctx.query;
      const result = await strapi.plugin("zhao-point").service("rule-engine").getEligibleActions(
        userId, channelId
      );
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getExchangeRate(ctx: any) {
    try {
      const configService = strapi.plugin("zhao-point").service("config-service");
      const config = await configService.getConfig();
      ctx.body = wrap({ rate: config.defaultExchangeRate || 1.0 });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getFeatureFlags(ctx: any) {
    try {
      const configService = strapi.plugin("zhao-point").service("config-service");
      const config = await configService.getConfig();
      ctx.body = wrap({
        signInEnabled: config?.signInEnabled !== false,
        tasksEnabled: config?.tasksEnabled !== false,
        redemptionEnabled: config?.redeemEnabled !== false,
        moduleEnabled: config?.moduleEnabled !== false,
        quizRetryEnabled: config?.quizRetryEnabled !== false,
        quizMaxRetryCount: config?.quizMaxRetryCount ?? 1,
        maxDailyQuiz: config?.maxDailyQuiz ?? 3,
      });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async signIn(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await strapi.plugin("zhao-point").service("sign-in").signIn(userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = e.status || (e.code === "SIGN_001" ? 400 : 500);
      ctx.body = { error: e.message, code: e.code };
    }
  },

  async getSignInStatus(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await strapi.plugin("zhao-point").service("sign-in").getSignInStatus(userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },

  async getTasks(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const result = await strapi.plugin("zhao-point").service("point").getTasks(userId);
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
  });
};
