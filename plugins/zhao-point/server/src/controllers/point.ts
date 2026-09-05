import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });
const ACTIVITY_UID = "plugin::zhao-point.activity";
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

  // 通过邀请码反查邀请人 up_user id；查不到返回 null。优先 zhao-sso 邀请码表（与活动裂变同一数据源）
  const resolveInviterByCode = async (inviteCode: string): Promise<number | null> => {
    try {
      const code = await strapi.db.query("plugin::zhao-sso.sso-invite-code").findOne({
        where: { code: inviteCode, is_active: true },
        populate: ["creator"],
      });
      const inviter = code?.creator;
      if (!inviter || inviter.status === "virtual") return null;
      const profileSvc = strapi.plugin("zhao-sso")?.service("sso-profile");
      if (profileSvc?.resolveUpUserForSsoUser) {
        const up = await profileSvc.resolveUpUserForSsoUser(inviter.id);
        if (up?.id) return up.id;
      }
      return null;
    } catch {
      return null;
    }
  };

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

  // 用户侧领取分享积分（白名单 action；积分值取规则，不信任客户端）
  async earnShare(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { action } = body;
      if (action !== "activity_share") {
        ctx.status = 400;
        ctx.body = { error: "不允许领取该类型积分", code: "POINT_021" };
        return;
      }
      const dimType = (["activity", "task"].includes(body.dimType || "")) ? body.dimType : "activity";
      const dimId = body.dimId != null ? body.dimId : body.activityId;
      const pointSvc = strapi.plugin("zhao-point").service("point");

      // 前置邀约落地校验：可领以 getShareStatus 为准（落地满 interval 分钟、未消耗、未达每日上限）
      const st = await pointSvc.getShareStatus({ userId, dimType, dimId });
      if (!st?.canClaim) {
        if (st?.waitNewLanding) {
          ctx.status = 400;
          ctx.body = { error: "已领取过该好友注册的分享积分，等待新的好友注册落地", code: "POINT_025" };
          return;
        }
        if (!st?.hasLanding) {
          ctx.status = 400;
          ctx.body = { error: "分享出去等待好友注册", code: "POINT_024" };
          return;
        }
        const cooldown = st.cooldownRemainingMs ?? 0;
        if (cooldown > 0) {
          const remainMin = Math.max(1, Math.ceil(cooldown / 60000));
          ctx.status = 400;
          ctx.body = { error: `邀约落地满 ${st.intervalMinutes ?? 30} 分钟后可领取，还剩 ${remainMin} 分钟`, code: "POINT_020" };
          return;
        }
        if ((st.dailyLimit ?? 0) > 0 && (st.dailyCount ?? 0) >= (st.dailyLimit ?? 0)) {
          ctx.status = 400;
          ctx.body = { error: "已达当日分享次数上限", code: "POINT_004" };
          return;
        }
        ctx.status = 400;
        ctx.body = { error: "当前不可领取分享积分", code: "POINT_020" };
        return;
      }

      // 定价：活动类按 shareRewardPoints；任务类用规则默认分
      let points: number | undefined;
      let remark = "分享活动";
      if (dimType === "activity" && dimId != null) {
        const idNum = Number(dimId);
        const act = await strapi.db.query(ACTIVITY_UID).findOne({
          where: Number.isNaN(idNum) ? { documentId: String(dimId) } : { id: idNum },
          select: ["documentId", "title", "shareRewardPoints"],
        });
        if (act?.shareRewardPoints) {
          points = Number(act.shareRewardPoints);
          remark = `分享活动:${act.title}`;
        }
      }
      // 解析用户归属渠道（客户渠道兜底）：
      // 1) 用户当前渠道(channel-member isCurrent) 2) 直接授权渠道第一个 3) 当前站点关联渠道第一个
      let resolvedChannel: number | undefined = undefined;
      const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
      if (channelSvc) {
        const member = await strapi.db.query("plugin::zhao-channel.channel-member")
          .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
        resolvedChannel = member?.channel?.id || member?.channel;
        if (!resolvedChannel) {
          const dirs = await channelSvc.getUserDirectChannels(userId);
          resolvedChannel = dirs?.[0];
        }
      }
      if (!resolvedChannel) {
        // 兜底：当前站点关联的第一个渠道（复用 ensureDefaultChannel 同一套 getAvailableChannels）
        const siteDocId = (ctx as any).state?.siteDocumentId;
        if (siteDocId) {
          const siteSvc = strapi.plugin("zhao-common")?.service("site-config");
          const siteChannels = siteSvc?.getAvailableChannels
            ? await siteSvc.getAvailableChannels(siteDocId)
            : null;
          resolvedChannel = Array.isArray(siteChannels) && siteChannels.length > 0
            ? (siteChannels[0].id ?? undefined)
            : undefined;
        }
      }
      const record = await pointSvc.earnPoints({
        userId, action, source: `share:${dimType}:${dimId ?? ""}`, method: "用户分享领取",
        remark, points, userChannelId: resolvedChannel, dimType, dimId,
      });
      ctx.body = wrap(record);
    } catch (e: any) {
      const status = ["POINT_001","POINT_004","POINT_011","POINT_019","POINT_020","POINT_024","POINT_025"].includes(e.code) ? 400 : 500;
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
        if (ch) where.channels = { id: ch.id };
        else where.channels = { id: -1 }; // 无匹配，返回空
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

  async shareStatus(ctx: any) {
    try {
      const userId = getUserId(ctx);
      const { dimType, dimId, activityId } = ctx.query || {};
      const result = await strapi.plugin("zhao-point").service("point").getShareStatus({ userId, dimType, dimId, activityId });
      ctx.body = wrap(result);
    } catch (e: any) {
      ctx.status = (e as any).status || 500;
      ctx.body = { error: e.message };
    }
  },

  // 分享裂变好友点击埋点（公开，无需登录）；每次点击各记一条（不做去重，冷却随首次点击计时）
  async reportShareVisit(ctx: any) {
    try {
      const body = ctx.request.body?.data || ctx.request.body || {};
      const { inviterId, inviteCode, targetType, targetId } = body;

      let inviter: number | null = null;
      if (inviterId !== undefined && inviterId !== null && inviterId !== "") {
        const uid = Number(inviterId);
        if (!isNaN(uid) && uid > 0) inviter = uid;
      } else if (inviteCode) {
        inviter = await resolveInviterByCode(String(inviteCode));
      }

      const VISIT_UID = "plugin::zhao-point.activity-share-visit";
      await strapi.db.query(VISIT_UID).create({
        data: {
          inviter: inviter ?? undefined,
          targetType: targetType || undefined,
          targetId: targetId || undefined,
        },
      });

      ctx.body = wrap({ ok: true, recorded: true });
    } catch (e: any) {
      ctx.status = (e as any).status || 400;
      ctx.body = { error: e.message };
    }
  },
  });
};
