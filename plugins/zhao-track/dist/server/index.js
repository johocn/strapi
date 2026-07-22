"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const UAParser = require("ua-parser-js");
const cronParser = require("cron-parser");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const UAParser__default = /* @__PURE__ */ _interopDefault(UAParser);
const cronParser__default = /* @__PURE__ */ _interopDefault(cronParser);
const config = {
  default: {
    attributionWindowDays: 7,
    clickRateLimitSeconds: 60,
    rateLimitMemoryMaxEntries: 1e4
  }
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_track_source_tags";
const info$2 = { "singularName": "source-tag", "pluralName": "source-tags", "displayName": "来源标签", "description": "用户来源识别" };
const options$2 = { "draftAndPublish": false };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "tagId": { "type": "uid", "required": true, "unique": true }, "promoCampaign": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.promo-campaign" }, "scene": { "type": "string" }, "sourceUrl": { "type": "text" }, "utmSource": { "type": "string" }, "utmMedium": { "type": "string" }, "utmCampaign": { "type": "string" }, "utmContent": { "type": "string" }, "utmTerm": { "type": "string" }, "deviceFingerprint": { "type": "string" }, "firstSeenAt": { "type": "datetime", "default": null }, "lastSeenAt": { "type": "datetime" } };
const sourceTag = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_track_click_events";
const info$1 = { "singularName": "click-event", "pluralName": "click-events", "displayName": "点击事件", "description": "优惠券点击追踪" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "coupon": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.coupon", "inversedBy": "clickEvents" }, "sourceTag": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-track.source-tag", "inversedBy": "clickEvents" }, "promoPid": { "type": "string" }, "promoCampaign": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.promo-campaign" }, "abVariant": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.ab-variant" }, "deviceFingerprint": { "type": "string", "required": true }, "clickedAt": { "type": "datetime", "required": true }, "ip": { "type": "string" }, "userAgent": { "type": "text" }, "browser": { "type": "string" }, "os": { "type": "string" }, "device": { "type": "string" }, "referer": { "type": "text" }, "resolvedLink": { "type": "text" } };
const clickEvent = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_track_orders";
const info = { "singularName": "order", "pluralName": "orders", "displayName": "订单记录", "description": "佣金订单与归因" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "orderId": { "type": "uid", "required": true, "unique": true }, "coupon": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.coupon" }, "sourceTag": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-track.source-tag" }, "promoPid": { "type": "string" }, "promoCampaign": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-studio.promo-campaign" }, "deviceFingerprint": { "type": "string" }, "transactedAt": { "type": "datetime", "required": true }, "amount": { "type": "decimal", "required": true }, "commission": { "type": "decimal" }, "commissionStatus": { "type": "enumeration", "enum": ["pending", "confirmed", "paid", "canceled"], "default": "pending" }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform" }, "matchedClick": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-track.click-event" }, "attributionQuality": { "type": "enumeration", "enum": ["pid_match", "click_match", "weak_match", "fallback_match", "unmatched"], "default": "unmatched" }, "syncedAt": { "type": "datetime" } };
const order = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "source-tag": { schema: sourceTag },
  "click-event": { schema: clickEvent },
  order: { schema: order }
};
const wrap$3 = (data, meta = {}) => ({ data, meta });
const click = ({ strapi }) => ({
  async click(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const orchestrator = strapi.plugin("zhao-track").service("click-orchestrator");
      const result = await orchestrator.orchestrate({
        couponId: String(body.couponId),
        sourceTagId: body.sourceTagId,
        deviceFingerprint: body.deviceFingerprint,
        utm: body.utm,
        referer: body.referer || ctx.request.header?.referer,
        userAgent: body.userAgent || ctx.request.header?.["user-agent"],
        ip: ctx.request.ip
      });
      ctx.body = wrap$3(result);
    } catch (e) {
      const codeMap = {
        DEAL_COUPON_NOT_FOUND: 404,
        TRACK_SOURCE_INVALID: 400,
        TRACK_CLICK_RATE_LIMITED: 429
      };
      ctx.status = codeMap[e.code] || 500;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$2 = (data, meta = {}) => ({ data, meta });
const source = ({ strapi }) => ({
  async identify(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const resolver = strapi.plugin("zhao-track").service("source-resolver");
      const { tag, isNew } = await resolver.identify({
        utm: body.utm,
        deviceFingerprint: body.deviceFingerprint,
        fullUrl: body.fullUrl,
        referer: body.referer
      });
      ctx.body = wrap$2({
        tagId: tag.tagId,
        promoChannelId: tag.promoChannelId,
        scene: tag.scene,
        isNew
      });
    } catch (e) {
      ctx.status = 400;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (Array.isArray(result)) return { data: result, meta: {} };
  return { data: result, meta: {} };
};
const CLICK_UID = "plugin::zhao-track.click-event";
const ORDER_UID$3 = "plugin::zhao-track.order";
const SOURCE_TAG_UID$1 = "plugin::zhao-track.source-tag";
const query = ({ strapi }) => {
  const buildWhere = (ctx, allowed) => {
    const where = {};
    for (const key of allowed) {
      if (ctx.query[key] !== void 0) where[key] = ctx.query[key];
    }
    if (ctx.query.startDate || ctx.query.endDate) {
      const field = ctx.query.dateField || "createdAt";
      where[field] = {};
      if (ctx.query.startDate) where[field].$gte = ctx.query.startDate;
      if (ctx.query.endDate) where[field].$lte = ctx.query.endDate;
    }
    return where;
  };
  return {
    async clicks(ctx) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["coupon", "sourceTag", "promoChannelId", "deviceFingerprint"]);
        if (ctx.query.dateField === void 0) {
          if (where.createdAt) {
            where.clickedAt = where.createdAt;
            delete where.createdAt;
          }
        }
        const [results, total] = await Promise.all([
          strapi.documents(CLICK_UID).findMany({
            where,
            orderBy: { clickedAt: "desc" },
            offset: (Number(page) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, sourceTag: true }
          }),
          strapi.db.query(CLICK_UID).count({ where })
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },
    async orders(ctx) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["promoChannelId", "commissionStatus", "orderStatus"]);
        if (ctx.query.startDate || ctx.query.endDate) {
          where.transactedAt = where.createdAt || {};
          delete where.createdAt;
        }
        const [results, total] = await Promise.all([
          strapi.documents(ORDER_UID$3).findMany({
            where,
            orderBy: { transactedAt: "desc" },
            offset: (Number(page) - 1) * Number(pageSize),
            limit: Number(pageSize),
            populate: { coupon: true, matchedClick: true, sourceTag: true }
          }),
          strapi.db.query(ORDER_UID$3).count({ where })
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    },
    async sourceTags(ctx) {
      try {
        const { page = 1, pageSize = 20 } = ctx.query;
        const where = buildWhere(ctx, ["promoChannelId"]);
        const [results, total] = await Promise.all([
          strapi.documents(SOURCE_TAG_UID$1).findMany({
            where,
            orderBy: { lastSeenAt: "desc" },
            offset: (Number(page) - 1) * Number(pageSize),
            limit: Number(pageSize)
          }),
          strapi.db.query(SOURCE_TAG_UID$1).count({ where })
        ]);
        ctx.body = wrapList({ results, total, page: Number(page), pageSize: Number(pageSize) });
      } catch (e) {
        ctx.status = 400;
        ctx.body = { error: e.message };
      }
    }
  };
};
const wrap$1 = (data, meta = {}) => ({ data, meta });
const ORDER_UID$2 = "plugin::zhao-track.order";
const report = ({ strapi }) => ({
  async attributionReport(ctx) {
    try {
      const { promoChannelId, startDate, endDate, groupBy = "day" } = ctx.query;
      const where = {};
      if (promoChannelId) where.promoChannelId = promoChannelId;
      if (startDate || endDate) {
        where.transactedAt = {};
        if (startDate) where.transactedAt.$gte = startDate;
        if (endDate) where.transactedAt.$lte = endDate;
      }
      const orders = await strapi.documents(ORDER_UID$2).findMany({
        where,
        limit: 5e3
      });
      const stats = {
        totalOrders: orders.length,
        matchedOrders: 0,
        unmatchedOrders: 0,
        totalCommission: 0,
        matchedCommission: 0,
        byQuality: { pid_match: 0, click_match: 0, weak_match: 0, fallback_match: 0, unmatched: 0 },
        groups: {}
      };
      for (const o of orders) {
        stats.totalCommission += Number(o.commissionAmount) || 0;
        const q = o.attributionQuality || "unmatched";
        stats.byQuality[q] = (stats.byQuality[q] || 0) + 1;
        if (q === "unmatched") {
          stats.unmatchedOrders++;
        } else {
          stats.matchedOrders++;
          stats.matchedCommission += Number(o.commissionAmount) || 0;
        }
        let groupKey = "all";
        if (groupBy === "day") {
          groupKey = new Date(o.transactedAt).toISOString().slice(0, 10);
        } else if (groupBy === "channel") {
          groupKey = o.promoChannelId || "unknown";
        } else if (groupBy === "coupon") {
          groupKey = o.coupon?.documentId || "unknown";
        }
        if (!stats.groups[groupKey]) stats.groups[groupKey] = { orders: 0, commission: 0 };
        stats.groups[groupKey].orders++;
        stats.groups[groupKey].commission += Number(o.commissionAmount) || 0;
      }
      ctx.body = wrap$1(stats);
    } catch (e) {
      ctx.status = 400;
      ctx.body = { error: e.message };
    }
  }
});
const wrap = (data, meta = {}) => ({ data, meta });
const adminSync = ({ strapi }) => ({
  async trigger(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { platformCode, conditions } = body;
      if (!platformCode) {
        ctx.status = 400;
        ctx.body = { error: "platformCode 必填", code: "TRACK_SOURCE_INVALID" };
        return;
      }
      const orderSync2 = strapi.plugin("zhao-track").service("order-sync");
      const params = { platformCode };
      if (conditions?.startTime) params.startTime = new Date(conditions.startTime);
      if (conditions?.endTime) params.endTime = new Date(conditions.endTime);
      const startedAt = Date.now();
      const stats = await orderSync2.syncOrders(params);
      const duration = Date.now() - startedAt;
      ctx.body = wrap({ platformCode, ...stats, duration });
    } catch (e) {
      const codeMap = { DEAL_ADAPTER_NOT_FOUND: 500 };
      ctx.status = codeMap[e.code] || 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async attributionRun(ctx) {
    try {
      const attribution2 = strapi.plugin("zhao-track").service("attribution");
      const stats = await attribution2.run();
      ctx.body = wrap(stats);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
});
const controllers = {
  click,
  source,
  query,
  report,
  "admin-sync": adminSync
};
const permissions = {
  actions: [
    { uid: "track.click.read", displayName: "读取点击" },
    { uid: "track.order.read", displayName: "读取订单" },
    { uid: "track.source.read", displayName: "读取来源标签" },
    { uid: "track.sync.trigger", displayName: "触发订单同步" }
  ]
};
const register = ({ strapi }) => {
  strapi.admin.services.permission.actionProvider.registerMany(permissions.actions);
  try {
    strapi.plugin("zhao-common").service("i18n").setMessages({
      TRACK_SOURCE_INVALID: "来源参数不合法（sourceTagId 和 utm 都未提供）",
      TRACK_CLICK_RATE_LIMITED: "点击频率超限",
      TRACK_ATTRIBUTION_NO_MATCH: "归因查询无匹配订单",
      TRACK_COUPON_NOT_FOUND: "优惠券不存在"
    });
  } catch {
  }
};
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-track] 插件已加载");
  try {
    const dealPlugin = strapi.plugin("zhao-deal");
    if (!dealPlugin) {
      strapi.log.warn("[zhao-track] zhao-deal 插件未启用，归因和链接置换功能将降级");
    }
  } catch {
    strapi.log.warn("[zhao-track] zhao-deal 插件未启用，归因和链接置换功能将降级");
  }
  try {
    const redis = strapi.redis || global.redis;
    if (redis) {
      strapi.log.info("[zhao-track] Redis 已检测到，RateLimiter 将使用 Redis 模式");
    } else {
      strapi.log.info("[zhao-track] Redis 未检测到，RateLimiter 将使用内存降级模式");
    }
  } catch {
  }
};
const destroy = ({ strapi }) => {
};
const SOURCE_TAG_UID = "plugin::zhao-track.source-tag";
const sourceResolver = ({ strapi }) => {
  return {
    async identify(opts) {
      let matchedCampaignId;
      let matchedChannelId;
      if (opts.utm?.utmSource) {
        try {
          const campaigns = await strapi.documents("plugin::zhao-studio.promo-campaign").findMany({
            filters: { code: opts.utm.utmSource },
            populate: { channel: true },
            limit: 1
          });
          if (campaigns && campaigns.length > 0) {
            matchedCampaignId = campaigns[0].documentId;
            matchedChannelId = campaigns[0].channel?.documentId;
          } else {
            const channels = await strapi.documents("plugin::zhao-studio.promo-channel").findMany({
              filters: { code: opts.utm.utmSource },
              limit: 1
            });
            if (channels && channels.length > 0) {
              matchedChannelId = channels[0].documentId;
            }
          }
        } catch (err) {
          strapi.log.warn(`[source-resolver] utm_source match failed: ${err.message}`);
        }
      }
      if (opts.sourceTagId) {
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: { tagId: opts.sourceTagId }
        });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: { lastSeenAt: /* @__PURE__ */ new Date() }
          });
          return { tag, isNew: false };
        }
      }
      if (opts.utm && (opts.utm.utmSource || opts.utm.utmMedium || opts.utm.utmCampaign)) {
        const filters = {};
        if (opts.utm.utmSource) filters.utmSource = opts.utm.utmSource;
        if (opts.utm.utmMedium) filters.utmMedium = opts.utm.utmMedium;
        if (opts.utm.utmCampaign) filters.utmCampaign = opts.utm.utmCampaign;
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({ filters });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: { lastSeenAt: /* @__PURE__ */ new Date() }
          });
          return { tag, isNew: false };
        }
      }
      if (opts.deviceFingerprint) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
        const tags = await strapi.documents(SOURCE_TAG_UID).findMany({
          filters: {
            deviceFingerprint: opts.deviceFingerprint,
            lastSeenAt: { $gte: thirtyDaysAgo.toISOString() }
          },
          sort: { lastSeenAt: "desc" }
        });
        if (tags && tags.length > 0) {
          const tag = tags[0];
          await strapi.documents(SOURCE_TAG_UID).update({
            documentId: tag.documentId,
            data: {
              lastSeenAt: /* @__PURE__ */ new Date(),
              utmSource: opts.utm?.utmSource || tag.utmSource,
              utmMedium: opts.utm?.utmMedium || tag.utmMedium,
              utmCampaign: opts.utm?.utmCampaign || tag.utmCampaign
            }
          });
          return { tag, isNew: false };
        }
      }
      const tagId = `utm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = /* @__PURE__ */ new Date();
      const newTag = await strapi.documents(SOURCE_TAG_UID).create({
        data: {
          tagId,
          promoCampaign: matchedCampaignId || null,
          sourceUrl: opts.fullUrl,
          utmSource: opts.utm?.utmSource,
          utmMedium: opts.utm?.utmMedium,
          utmCampaign: opts.utm?.utmCampaign,
          utmContent: opts.utm?.utmContent,
          utmTerm: opts.utm?.utmTerm,
          deviceFingerprint: opts.deviceFingerprint,
          firstSeenAt: now,
          lastSeenAt: now
        }
      });
      return { tag: newTag, isNew: true };
    }
  };
};
const rateLimiter = ({ strapi }) => {
  const memoryMap = /* @__PURE__ */ new Map();
  const MAX_ENTRIES = 1e4;
  const TTL_SECONDS = 60;
  const getRedis = () => {
    try {
      const redis = strapi.redis || global.redis;
      return redis && typeof redis.get === "function" && typeof redis.set === "function" ? redis : null;
    } catch {
      return null;
    }
  };
  const evictIfNeeded = () => {
    if (memoryMap.size <= MAX_ENTRIES) return;
    const now = Date.now();
    for (const [key, val] of memoryMap) {
      if (val.expiresAt < now) memoryMap.delete(key);
    }
    if (memoryMap.size > MAX_ENTRIES) {
      const keys = Array.from(memoryMap.keys()).slice(0, 1e3);
      keys.forEach((k) => memoryMap.delete(k));
    }
  };
  return {
    async checkAndRecord(deviceFingerprint, couponId) {
      const key = `click_rate:${deviceFingerprint}:${couponId}`;
      const redis = getRedis();
      if (redis) {
        try {
          const existing2 = await redis.get(key);
          if (existing2) {
            return { allowed: false };
          }
          await redis.set(key, "1", "EX", TTL_SECONDS);
          return { allowed: true };
        } catch (err) {
          strapi.log.warn(`[zhao-track] Redis 不可用，降级内存: ${err.message}`);
        }
      }
      const now = Date.now();
      const existing = memoryMap.get(key);
      if (existing && existing.expiresAt > now) {
        return { allowed: false };
      }
      evictIfNeeded();
      memoryMap.set(key, { count: 1, expiresAt: now + TTL_SECONDS * 1e3 });
      return { allowed: true };
    },
    _resetMemory() {
      memoryMap.clear();
    }
  };
};
const COUPON_UID = "plugin::zhao-deal.coupon";
const CLICK_EVENT_UID$1 = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID$1 = "plugin::zhao-studio.channel-platform-config";
const clickOrchestrator = ({ strapi }) => {
  return {
    async orchestrate(req) {
      if (!req.couponId) {
        const err = new Error("couponId 必填");
        err.code = "TRACK_SOURCE_INVALID";
        throw err;
      }
      const coupons = await strapi.documents(COUPON_UID).findMany({
        filters: { couponId: req.couponId },
        populate: { platform: true, product: true }
      });
      if (!coupons || coupons.length === 0) {
        const err = new Error("优惠券不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      const coupon = coupons[0];
      if (!req.sourceTagId && !(req.utm && (req.utm.utmSource || req.utm.utmMedium))) {
        const err = new Error("sourceTagId 或 utm 至少一个");
        err.code = "TRACK_SOURCE_INVALID";
        throw err;
      }
      const rateLimiter2 = strapi.plugin("zhao-track").service("rate-limiter");
      const rateCheck = await rateLimiter2.checkAndRecord(req.deviceFingerprint, req.couponId);
      if (!rateCheck.allowed) {
        const err = new Error("点击频率超限");
        err.code = "TRACK_CLICK_RATE_LIMITED";
        throw err;
      }
      const sourceResolver2 = strapi.plugin("zhao-track").service("source-resolver");
      const { tag } = await sourceResolver2.identify({
        sourceTagId: req.sourceTagId,
        utm: req.utm,
        deviceFingerprint: req.deviceFingerprint,
        referer: req.referer
      });
      let abVariant = null;
      try {
        const abTest = strapi.plugin("zhao-studio")?.service("ab-test");
        if (abTest) {
          abVariant = await abTest.pickVariant({
            campaignId: tag.promoCampaign?.documentId,
            channelId: tag.promoCampaign?.channel?.documentId
          });
        }
      } catch (err) {
        strapi.log.warn(`[click] ab-test pickVariant failed: ${err.message}`);
      }
      let promoPid = "";
      const channelId = tag.promoCampaign?.channel?.documentId;
      if (channelId && coupon.platform?.code) {
        try {
          const configs = await strapi.documents(CHANNEL_CONFIG_UID$1).findMany({
            filters: { channel: channelId, platform: { type: coupon.platform.code } },
            limit: 1
          });
          if (configs && configs.length > 0) {
            promoPid = configs[0].promoPid || "";
          }
        } catch (err) {
          strapi.log.warn(`[click] ChannelPlatformConfig lookup failed: ${err.message}`);
        }
      }
      let resolvedLink = coupon.promoLink;
      try {
        const dealPlugin = strapi.plugin("zhao-deal");
        if (!dealPlugin) {
          strapi.log.warn("[click] zhao-deal plugin not enabled, using original promoLink");
        } else {
          const registry = dealPlugin.service("adapterRegistry");
          if (!registry) {
            strapi.log.warn("[click] adapterRegistry service not available, using original promoLink");
          } else {
            const adapter = registry.get(coupon.platform?.code);
            const result = await adapter.transformLink({
              promoLink: coupon.promoLink,
              promoChannelId: promoPid,
              sourceTagId: tag.tagId
            });
            resolvedLink = result.resolvedLink;
          }
        }
      } catch (err) {
        strapi.log.warn(`[click] transformLink failed, using original promoLink: ${err.message}`);
      }
      let browser = "", os = "", device = "";
      if (req.userAgent) {
        try {
          const parsed = new UAParser__default.default(req.userAgent).getResult();
          browser = parsed.browser.name || "";
          os = parsed.os.name || "";
          device = parsed.device.type || "desktop";
        } catch {
        }
      }
      const clickEvent2 = await strapi.documents(CLICK_EVENT_UID$1).create({
        data: {
          coupon: coupon.documentId,
          sourceTag: tag.documentId,
          promoCampaign: tag.promoCampaign?.documentId || null,
          promoPid,
          abVariant: abVariant?.documentId || null,
          deviceFingerprint: req.deviceFingerprint,
          clickedAt: /* @__PURE__ */ new Date(),
          ip: req.ip,
          userAgent: req.userAgent,
          browser,
          os,
          device,
          referer: req.referer,
          resolvedLink
        }
      });
      return {
        clickId: clickEvent2.documentId,
        resolvedLink,
        coupon: {
          documentId: coupon.documentId,
          couponId: coupon.couponId,
          amountDesc: coupon.amountDesc,
          product: coupon.product
        }
      };
    }
  };
};
const ORDER_UID$1 = "plugin::zhao-track.order";
const CLICK_EVENT_UID = "plugin::zhao-track.click-event";
const CHANNEL_CONFIG_UID = "plugin::zhao-studio.channel-platform-config";
const CAMPAIGN_UID = "plugin::zhao-studio.promo-campaign";
const attribution = ({ strapi }) => {
  const getWindowDays = () => {
    try {
      const cm = strapi.plugin("zhao-common").service("config-manager");
      const v = cm?.get?.("attributionWindowDays", 7);
      return typeof v === "number" && v > 0 ? v : 7;
    } catch {
      return 7;
    }
  };
  const findMatchingClick = async (order2) => {
    const WINDOW_DAYS = getWindowDays();
    const transactedAt = new Date(order2.transactedAt || /* @__PURE__ */ new Date());
    const windowStart = new Date(transactedAt);
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);
    const couponDocId = order2.coupon?.documentId || order2.coupon;
    if (order2.promoPid) {
      try {
        const configs = await strapi.documents(CHANNEL_CONFIG_UID).findMany({
          filters: { promoPid: order2.promoPid },
          populate: { channel: true },
          limit: 1
        });
        if (configs && configs.length > 0) {
          const channelId = configs[0].channel?.documentId;
          if (channelId) {
            const campaigns = await strapi.documents(CAMPAIGN_UID).findMany({
              filters: { channel: channelId }
            });
            const campaignIds = (campaigns || []).map((c) => c.documentId);
            if (campaignIds.length > 0) {
              const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
                filters: {
                  coupon: couponDocId,
                  promoCampaign: { $in: campaignIds },
                  clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() }
                },
                sort: { clickedAt: "desc" },
                limit: 1
              });
              if (clicks && clicks.length > 0) {
                return { click: clicks[0], quality: "pid_match" };
              }
            }
          }
        }
      } catch (err) {
        strapi.log.warn(`[attribution] rule1 (pid_match) failed: ${err.message}`);
      }
    }
    if (order2.deviceFingerprint) {
      try {
        const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
          filters: {
            coupon: couponDocId,
            deviceFingerprint: order2.deviceFingerprint,
            clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() }
          },
          sort: { clickedAt: "desc" },
          limit: 1
        });
        if (clicks && clicks.length > 0) {
          return { click: clicks[0], quality: "click_match" };
        }
      } catch (err) {
        strapi.log.warn(`[attribution] rule2 (click_match) failed: ${err.message}`);
      }
    }
    if (order2.promoPid) {
      try {
        const configs = await strapi.documents(CHANNEL_CONFIG_UID).findMany({
          filters: { promoPid: order2.promoPid },
          populate: { channel: true },
          limit: 1
        });
        if (configs && configs.length > 0) {
          const channelId = configs[0].channel?.documentId;
          if (channelId) {
            const campaigns = await strapi.documents(CAMPAIGN_UID).findMany({
              filters: { channel: channelId }
            });
            const campaignIds = (campaigns || []).map((c) => c.documentId);
            if (campaignIds.length > 0) {
              const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
                filters: {
                  coupon: couponDocId,
                  promoCampaign: { $in: campaignIds },
                  clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() }
                },
                sort: { clickedAt: "desc" },
                limit: 1
              });
              if (clicks && clicks.length > 0) {
                return { click: clicks[0], quality: "weak_match" };
              }
            }
          }
        }
      } catch (err) {
        strapi.log.warn(`[attribution] rule3 (weak_match) failed: ${err.message}`);
      }
    }
    try {
      const clicks = await strapi.documents(CLICK_EVENT_UID).findMany({
        filters: {
          coupon: couponDocId,
          clickedAt: { $gte: windowStart.toISOString(), $lte: transactedAt.toISOString() }
        },
        sort: { clickedAt: "desc" },
        limit: 1
      });
      if (clicks && clicks.length > 0) {
        return { click: clicks[0], quality: "fallback_match" };
      }
    } catch (err) {
      strapi.log.warn(`[attribution] rule4 (fallback_match) failed: ${err.message}`);
    }
    return null;
  };
  return {
    findMatchingClick,
    /**
     * 执行归因：扫描所有 matchedClick 为空的订单，逐条匹配并写入
     * 幂等：仅处理 matchedClick: null 的订单
     */
    async run(opts) {
      const limit = opts?.limit || 500;
      const pendingOrders = await strapi.documents(ORDER_UID$1).findMany({
        filters: { matchedClick: null },
        populate: { coupon: true },
        limit,
        sort: { transactedAt: "asc" }
      });
      const stats = { total: pendingOrders.length, matched: 0, unmatched: 0, byQuality: { pid_match: 0, click_match: 0, weak_match: 0, fallback_match: 0 } };
      for (const order2 of pendingOrders) {
        try {
          const result = await findMatchingClick(order2);
          if (result) {
            const updateData = {
              matchedClick: result.click.documentId,
              attributionQuality: result.quality
            };
            if (result.sourceTagId) {
              updateData.sourceTag = result.sourceTagId;
            }
            if (result.click.promoCampaign && !order2.promoCampaign) {
              updateData.promoCampaign = result.click.promoCampaign;
            }
            await strapi.documents(ORDER_UID$1).update({
              documentId: order2.documentId,
              data: updateData
            });
            stats.matched++;
            stats.byQuality[result.quality]++;
          } else {
            await strapi.documents(ORDER_UID$1).update({
              documentId: order2.documentId,
              data: { attributionQuality: "unmatched" }
            });
            stats.unmatched++;
          }
        } catch (err) {
          strapi.log.warn(`[attribution] order ${order2.orderId} failed: ${err.message}`);
        }
      }
      strapi.log.info(`[attribution] done: ${stats.matched}/${stats.total} matched, ${stats.unmatched} unmatched`);
      return stats;
    }
  };
};
const PLATFORM_UID$1 = "plugin::zhao-deal.platform";
const ORDER_UID = "plugin::zhao-track.order";
const orderSync = ({ strapi }) => {
  const throwError = (code, message, details) => {
    const err = new Error(message);
    err.code = code;
    err.details = details;
    throw err;
  };
  const getPlatform = async (platformCode) => {
    const platforms = await strapi.documents(PLATFORM_UID$1).findMany({
      filters: { code: platformCode, syncEnabled: true },
      limit: 1
    });
    if (!platforms || platforms.length === 0) {
      throwError("DEAL_ADAPTER_NOT_FOUND", `平台 ${platformCode} 未启用或不存在`);
    }
    return platforms[0];
  };
  const getAdapter = (platformCode) => {
    const dealPlugin = strapi.plugin("zhao-deal");
    const registry = dealPlugin?.service?.("adapterRegistry");
    if (!registry) {
      throwError("DEAL_ADAPTER_NOT_FOUND", "zhao-deal adapterRegistry 不可用");
    }
    const adapter = registry.get(platformCode);
    if (!adapter) {
      throwError("DEAL_ADAPTER_NOT_FOUND", `平台 ${platformCode} 的 adapter 未注册`);
    }
    return adapter;
  };
  return {
    async syncOrders(params) {
      const platform = await getPlatform(params.platformCode);
      const adapter = getAdapter(params.platformCode);
      const startTime = params.startTime || new Date(Date.now() - 24 * 3600 * 1e3);
      const endTime = params.endTime || /* @__PURE__ */ new Date();
      const stats = { fetched: 0, created: 0, updated: 0, errors: [] };
      let pageNo = 1;
      const pageSize = 50;
      while (true) {
        let batch;
        try {
          batch = await adapter.fetchOrders({
            startTime,
            endTime,
            pageNo,
            pageSize,
            fetchConfig: platform.fetchConfig?.orders
          });
        } catch (err) {
          stats.errors.push(`page ${pageNo} failed: ${err.message}`);
          break;
        }
        stats.fetched += batch.list.length;
        for (const item of batch.list) {
          try {
            let couponDocId;
            if (item.couponId) {
              const coupons = await strapi.documents("plugin::zhao-deal.coupon").findMany({
                filters: { couponId: item.couponId },
                limit: 1
              });
              if (coupons && coupons.length > 0) couponDocId = coupons[0].documentId;
            }
            const existing = await strapi.documents(ORDER_UID).findMany({
              filters: { orderId: item.orderId },
              limit: 1
            });
            if (existing && existing.length > 0) {
              await strapi.documents(ORDER_UID).update({
                documentId: existing[0].documentId,
                data: {
                  amount: item.amount,
                  commission: item.commission,
                  commissionStatus: item.commissionStatus,
                  promoPid: item.promoPid || existing[0].promoPid,
                  deviceFingerprint: item.deviceFingerprint || existing[0].deviceFingerprint,
                  syncedAt: /* @__PURE__ */ new Date()
                }
              });
              stats.updated++;
            } else {
              await strapi.documents(ORDER_UID).create({
                data: {
                  orderId: item.orderId,
                  coupon: couponDocId,
                  promoChannelId: item.promoChannelId,
                  promoPid: item.promoPid,
                  deviceFingerprint: item.deviceFingerprint,
                  amount: item.amount,
                  commission: item.commission,
                  commissionStatus: item.commissionStatus || "pending",
                  transactedAt: item.transactedAt,
                  attributionQuality: "unmatched",
                  syncedAt: /* @__PURE__ */ new Date()
                }
              });
              stats.created++;
            }
          } catch (err) {
            stats.errors.push(`order ${item.orderId}: ${err.message}`);
          }
        }
        if (!batch.hasNext || batch.list.length < pageSize) break;
        pageNo++;
      }
      return stats;
    }
  };
};
const PLATFORM_UID = "plugin::zhao-deal.platform";
const orderSyncScheduler = ({ strapi }) => {
  const getPluginStore = () => strapi.store({ type: "plugin", name: "zhao-track" });
  const shouldRunNow = async (platformCode, syncCron) => {
    if (!syncCron) return false;
    try {
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getPluginStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr) : /* @__PURE__ */ new Date(0);
      const parser = cronParser__default.default.parseExpression(syncCron, { currentDate: lastRun });
      const nextRun = parser.next().toDate();
      const now = /* @__PURE__ */ new Date();
      if (now >= nextRun && now.getTime() - lastRun.getTime() > 60 * 1e3) {
        await getPluginStore().set({ key: storeKey, value: now.toISOString() });
        return true;
      }
      return false;
    } catch (err) {
      strapi.log.warn(`[order-sync-scheduler] shouldRunNow failed for ${platformCode}: ${err.message}`);
      return false;
    }
  };
  return {
    shouldRunNow,
    async run() {
      let platforms = [];
      try {
        platforms = await strapi.documents(PLATFORM_UID).findMany({
          filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } }
        });
      } catch (err) {
        strapi.log.warn(`[order-sync-scheduler] load platforms failed: ${err.message}`);
        return { processed: 0 };
      }
      let processed = 0;
      for (const platform of platforms) {
        try {
          const should = await shouldRunNow(platform.code, platform.syncCron);
          if (!should) continue;
          const orderSync2 = strapi.plugin("zhao-track").service("order-sync");
          const stats = await orderSync2.syncOrders({ platformCode: platform.code });
          strapi.log.info(`[order-sync-scheduler] ${platform.code}: fetched=${stats.fetched} created=${stats.created} updated=${stats.updated}`);
          processed++;
        } catch (err) {
          strapi.log.warn(`[order-sync-scheduler] platform ${platform.code} failed: ${err.message}`);
        }
      }
      return { processed };
    }
  };
};
const services = {
  "source-resolver": sourceResolver,
  "rate-limiter": rateLimiter,
  "click-orchestrator": clickOrchestrator,
  attribution,
  "order-sync": orderSync,
  "order-sync-scheduler": orderSyncScheduler
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false }
});
const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由（无鉴权） =====
    publicRoute("POST", "/zhao-track/click", "click.click"),
    publicRoute("POST", "/zhao-track/source/identify", "source.identify"),
    // ===== 用户路由（需登录） =====
    userRoute("GET", "/zhao-track/clicks", "query.clicks"),
    userRoute("GET", "/zhao-track/orders", "query.orders"),
    userRoute("GET", "/zhao-track/source-tags", "query.sourceTags"),
    userRoute("GET", "/zhao-track/attribution/report", "report.attributionReport")
  ]
});
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const adminApi = () => ({
  type: "admin",
  routes: [
    adminRoute("POST", "/zhao-track/sync/trigger", "admin-sync.trigger", "zhao-track.sync.trigger"),
    adminRoute("POST", "/zhao-track/attribution/run", "admin-sync.attributionRun", "zhao-track.attribution.run")
  ]
});
const routes = {
  "content-api": contentApi,
  "admin-api": adminApi
};
const policies = {};
const middlewares = {};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  contentTypes,
  services,
  routes,
  policies,
  middlewares
};
exports.default = index;
