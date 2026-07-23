import cronParser from "cron-parser";
const config = {
  default: {
    attributionWindowDays: 7,
    clickRateLimitSeconds: 60,
    rateLimitMemoryMaxEntries: 1e4
  }
};
const kind$6 = "collectionType";
const collectionName$6 = "zhao_deal_platforms";
const info$6 = { "singularName": "platform", "pluralName": "platforms", "displayName": "平台管理", "description": "电商平台与同步配置" };
const options$6 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$6 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$6 = { "name": { "type": "string", "required": true }, "code": { "type": "enumeration", "required": true, "unique": true, "enum": ["taobao", "pdd", "douyin", "jd"] }, "promoSite": { "type": "string" }, "couponRule": { "type": "text" }, "apiEndpoint": { "type": "string" }, "appKey": { "type": "string" }, "appSecret": { "type": "password" }, "signRule": { "type": "string" }, "syncEnabled": { "type": "boolean", "default": false }, "syncMode": { "type": "enumeration", "enum": ["manual", "scheduled", "both"], "default": "manual" }, "syncCron": { "type": "string" }, "fetchConfig": { "type": "json" } };
const platform = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  pluginOptions: pluginOptions$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_deal_categories";
const info$5 = { "singularName": "category", "pluralName": "categories", "displayName": "商品分类", "description": "商品类目管理" };
const options$5 = { "draftAndPublish": false };
const pluginOptions$5 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$5 = { "name": { "type": "string", "required": true }, "code": { "type": "string", "required": true, "unique": true }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform", "inversedBy": "categories" }, "sort": { "type": "integer", "default": 0 }, "icon": { "type": "media", "allowedTypes": ["images"], "multiple": false } };
const category = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  pluginOptions: pluginOptions$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_deal_coupons";
const info$4 = { "singularName": "coupon", "pluralName": "coupons", "displayName": "优惠券", "description": "正式优惠券库" };
const options$4 = { "draftAndPublish": false };
const pluginOptions$4 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$4 = { "couponId": { "type": "uid", "required": true, "unique": true }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform", "inversedBy": "coupons" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.category", "inversedBy": "coupons" }, "promoLink": { "type": "text", "required": true }, "amountDesc": { "type": "string", "required": true }, "useRule": { "type": "text" }, "useCondition": { "type": "string" }, "useScope": { "type": "string" }, "startAt": { "type": "datetime" }, "endAt": { "type": "datetime" }, "receiveCount": { "type": "integer", "default": 0 }, "usedCount": { "type": "integer", "default": 0 }, "originalPrice": { "type": "decimal" }, "onlineAt": { "type": "datetime" }, "offlineAt": { "type": "datetime" }, "isRecommended": { "type": "boolean", "default": false }, "isHot": { "type": "boolean", "default": false }, "isNew": { "type": "boolean", "default": false }, "sortOrder": { "type": "integer", "default": 0 }, "promoChannels": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-studio.promo-channel", "inversedBy": "coupons" }, "collection": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.coupon-collection", "inversedBy": "coupons" } };
const coupon$1 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  pluginOptions: pluginOptions$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_deal_products";
const info$3 = { "singularName": "product", "pluralName": "products", "displayName": "商品", "description": "正式商品库" };
const options$3 = { "draftAndPublish": false };
const pluginOptions$3 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$3 = { "productId": { "type": "uid", "required": true, "unique": true }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform", "inversedBy": "products" }, "title": { "type": "string", "required": true }, "mainImage": { "type": "media", "allowedTypes": ["images"], "multiple": false }, "detailUrl": { "type": "string" }, "originalPrice": { "type": "decimal" }, "couponAmount": { "type": "decimal" }, "finalPrice": { "type": "decimal" }, "sales30d": { "type": "integer" }, "reviewCount": { "type": "integer" }, "reviewScore": { "type": "decimal" }, "brand": { "type": "string" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.category", "inversedBy": "products" }, "coupon": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-deal.coupon", "inversedBy": "product" }, "isRecommended": { "type": "boolean", "default": false }, "isHot": { "type": "boolean", "default": false }, "isNew": { "type": "boolean", "default": false }, "sortOrder": { "type": "integer", "default": 0 } };
const product$1 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_deal_coupon_candidates";
const info$2 = { "singularName": "coupon-candidate", "pluralName": "coupon-candidates", "displayName": "优惠券候选", "description": "拉取候选池待审核" };
const options$2 = { "draftAndPublish": false };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "couponId": { "type": "uid", "required": true }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.category" }, "amountDesc": { "type": "string", "required": true }, "couponAmount": { "type": "decimal" }, "useCondition": { "type": "string" }, "useScope": { "type": "string" }, "startAt": { "type": "datetime" }, "endAt": { "type": "datetime" }, "receiveCount": { "type": "integer" }, "usedCount": { "type": "integer" }, "originalPrice": { "type": "decimal" }, "onlineAt": { "type": "datetime" }, "offlineAt": { "type": "datetime" }, "promoLink": { "type": "text", "required": true }, "fetchedAt": { "type": "datetime", "required": true }, "status": { "type": "enumeration", "enum": ["pending", "approved", "rejected", "imported"], "default": "pending", "required": true }, "rejectReason": { "type": "string" }, "importedCoupon": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-deal.coupon" } };
const couponCandidate = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_deal_product_candidates";
const info$1 = { "singularName": "product-candidate", "pluralName": "product-candidates", "displayName": "商品候选", "description": "拉取候选池待审核" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "productId": { "type": "uid", "required": true }, "platform": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.platform" }, "title": { "type": "string", "required": true }, "mainImage": { "type": "media", "allowedTypes": ["images"], "multiple": false }, "detailUrl": { "type": "string" }, "originalPrice": { "type": "decimal" }, "couponAmount": { "type": "decimal" }, "finalPrice": { "type": "decimal" }, "sales30d": { "type": "integer" }, "reviewCount": { "type": "integer" }, "reviewScore": { "type": "decimal" }, "brand": { "type": "string" }, "category": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-deal.category" }, "fetchedAt": { "type": "datetime", "required": true }, "status": { "type": "enumeration", "enum": ["pending", "approved", "rejected", "imported"], "default": "pending", "required": true }, "rejectReason": { "type": "string" }, "importedProduct": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-deal.product" } };
const productCandidate = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_deal_coupon_collections";
const info = { "singularName": "coupon-collection", "pluralName": "coupon-collections", "displayName": "优惠券合集", "description": "活动专题合集" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "name": { "type": "string", "required": true }, "code": { "type": "string", "required": true, "unique": true }, "description": { "type": "text" }, "coverImage": { "type": "media", "allowedTypes": ["images"], "multiple": false }, "coupons": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-deal.coupon", "mappedBy": "collection" }, "startAt": { "type": "datetime" }, "endAt": { "type": "datetime" }, "sortOrder": { "type": "integer", "default": 0 }, "status": { "type": "boolean", "default": true } };
const couponCollection = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  platform: { schema: platform },
  category: { schema: category },
  coupon: { schema: coupon$1 },
  product: { schema: product$1 },
  "coupon-candidate": { schema: couponCandidate },
  "product-candidate": { schema: productCandidate },
  "coupon-collection": { schema: couponCollection }
};
const wrap$4 = (data, meta2 = {}) => ({ data, meta: meta2 });
const coupon = ({ strapi }) => ({
  async list(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCoupons(ctx.query);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async get(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getCoupon(ctx.params.couponId);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_COUPON_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async listCollections(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCollections();
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
  async getCollection(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getCollection(ctx.params.code);
      ctx.body = wrap$4(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_COLLECTION_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$3 = (data, meta2 = {}) => ({ data, meta: meta2 });
const product = ({ strapi }) => ({
  async list(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listProducts(ctx.query);
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
  async get(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").getProduct(ctx.params.productId);
      ctx.body = wrap$3(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_COUPON_NOT_FOUND" ? 404 : 500;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap$2 = (data, meta2 = {}) => ({ data, meta: meta2 });
const meta = ({ strapi }) => ({
  async categories(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listCategories(ctx.query.platform);
      ctx.body = wrap$2(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
  async platforms(ctx) {
    try {
      const result = await strapi.plugin("zhao-deal").service("query").listPlatforms();
      ctx.body = wrap$2(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
});
const wrap$1 = (data) => ({ data });
const adminSync = ({ strapi }) => ({
  async trigger(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { platformCode, type, conditions } = body;
      if (!platformCode || !type) {
        ctx.status = 400;
        ctx.body = { error: "platformCode 和 type 必填" };
        return;
      }
      const result = await strapi.plugin("zhao-deal").service("sync").syncPlatformData({
        platformCode,
        type,
        conditions
      });
      ctx.body = wrap$1(result);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message, code: e.code };
    }
  }
});
const wrap = (data) => ({ data });
const candidate$1 = ({ strapi }) => ({
  async approve(ctx) {
    try {
      const documentId = ctx.params.documentId;
      const result = await strapi.plugin("zhao-deal").service("candidate").approveCouponCandidate(documentId);
      ctx.body = wrap(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async reject(ctx) {
    try {
      const documentId = ctx.params.documentId;
      const body = ctx.request.body?.data || ctx.request.body;
      const result = await strapi.plugin("zhao-deal").service("candidate").rejectCouponCandidate(documentId, body.reason || "");
      ctx.body = wrap(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async approveProduct(ctx) {
    try {
      const documentId = ctx.params.documentId;
      const result = await strapi.plugin("zhao-deal").service("candidate").approveProductCandidate(documentId);
      ctx.body = wrap(result);
    } catch (e) {
      ctx.status = e.code === "DEAL_CANDIDATE_NOT_FOUND" ? 404 : 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
  async batchApprove(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { documentIds } = body;
      const results = [];
      for (const id of documentIds) {
        try {
          results.push(await strapi.plugin("zhao-deal").service("candidate").approveCouponCandidate(id));
        } catch (e) {
          results.push({ documentId: id, error: e.message });
        }
      }
      ctx.body = wrap(results);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  },
  async batchReject(ctx) {
    try {
      const body = ctx.request.body?.data || ctx.request.body;
      const { documentIds, reason } = body;
      const results = [];
      for (const id of documentIds) {
        try {
          results.push(await strapi.plugin("zhao-deal").service("candidate").rejectCouponCandidate(id, reason || ""));
        } catch (e) {
          results.push({ documentId: id, error: e.message });
        }
      }
      ctx.body = wrap(results);
    } catch (e) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  }
});
const controllers = {
  coupon,
  product,
  meta,
  "admin-sync": adminSync,
  candidate: candidate$1
};
const actions = [
  { uid: "coupon.read", displayName: "读取优惠券" },
  { uid: "coupon.create", displayName: "创建优惠券" },
  { uid: "coupon.update", displayName: "更新优惠券" },
  { uid: "coupon.delete", displayName: "删除优惠券" },
  { uid: "product.read", displayName: "读取商品" },
  { uid: "product.create", displayName: "创建商品" },
  { uid: "product.update", displayName: "更新商品" },
  { uid: "product.delete", displayName: "删除商品" },
  { uid: "candidate.approve", displayName: "审核候选" },
  { uid: "sync.trigger", displayName: "触发同步" }
];
const permissions = { actions };
const register = ({ strapi }) => {
  strapi.admin.services.permission.actionProvider.registerMany(permissions.actions);
  try {
    strapi.plugin("zhao-common").service("i18n").setMessages({
      DEAL_ADAPTER_NOT_FOUND: "平台 adapter 未注册: {platformCode}",
      DEAL_COUPON_NOT_FOUND: "优惠券不存在",
      DEAL_COUPON_OFFLINE: "优惠券已下线",
      DEAL_COLLECTION_NOT_FOUND: "优惠券合集不存在",
      DEAL_CANDIDATE_NOT_FOUND: "候选记录不存在",
      DEAL_CANDIDATE_ALREADY_IMPORTED: "候选已导入，不可重复审核",
      DEAL_SYNC_FAILED: "同步失败: {message}"
    });
  } catch {
  }
};
class AdapterRegistry {
  constructor() {
    this.adapters = /* @__PURE__ */ new Map();
  }
  register(adapter) {
    this.adapters.set(adapter.platformCode, adapter);
  }
  get(platformCode) {
    const adapter = this.adapters.get(platformCode);
    if (!adapter) {
      const err = new Error(`Platform adapter not found: ${platformCode}`);
      err.code = "DEAL_ADAPTER_NOT_FOUND";
      throw err;
    }
    return adapter;
  }
  has(platformCode) {
    return this.adapters.has(platformCode);
  }
  list() {
    return Array.from(this.adapters.keys());
  }
}
class TaobaoAdapter {
  constructor(config2) {
    this.platformCode = "taobao";
    this.appKey = config2.appKey;
    this.appSecret = config2.appSecret;
    this.apiEndpoint = config2.apiEndpoint;
  }
  async fetchCoupons(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async fetchProducts(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async transformLink(opts) {
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }
  async fetchOrders(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
}
class PddAdapter {
  constructor(config2) {
    this.platformCode = "pdd";
    this.appKey = config2.appKey;
    this.appSecret = config2.appSecret;
    this.apiEndpoint = config2.apiEndpoint;
  }
  async fetchCoupons(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async fetchProducts(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async transformLink(opts) {
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }
  async fetchOrders(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
}
class DouyinAdapter {
  constructor(config2) {
    this.platformCode = "douyin";
    this.appKey = config2.appKey;
    this.appSecret = config2.appSecret;
    this.apiEndpoint = config2.apiEndpoint;
  }
  async fetchCoupons(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async fetchProducts(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async transformLink(opts) {
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }
  async fetchOrders(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
}
class JdAdapter {
  constructor(config2) {
    this.platformCode = "jd";
    this.appKey = config2.appKey;
    this.appSecret = config2.appSecret;
    this.apiEndpoint = config2.apiEndpoint;
  }
  async fetchCoupons(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async fetchProducts(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
  async transformLink(opts) {
    return { resolvedLink: opts.promoLink, promoPid: opts.promoChannelId };
  }
  async fetchOrders(_opts) {
    return { list: [], total: 0, hasNext: false };
  }
}
class MockAdapter {
  constructor() {
    this.platformCode = "mock";
    this.couponList = [];
    this.productList = [];
    this.orderList = [];
  }
  setMockData(coupons, products, orders) {
    this.couponList = coupons;
    this.productList = products;
    this.orderList = orders;
  }
  async fetchCoupons(opts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.couponList.slice(start, start + opts.pageSize);
    return { list, total: this.couponList.length, hasNext: start + opts.pageSize < this.couponList.length };
  }
  async fetchProducts(opts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.productList.slice(start, start + opts.pageSize);
    return { list, total: this.productList.length, hasNext: start + opts.pageSize < this.productList.length };
  }
  async transformLink(opts) {
    return { resolvedLink: opts.promoLink + "?pid=" + opts.promoChannelId, promoPid: opts.promoChannelId };
  }
  async fetchOrders(opts) {
    const start = (opts.pageNo - 1) * opts.pageSize;
    const list = this.orderList.slice(start, start + opts.pageSize);
    return { list, total: this.orderList.length, hasNext: start + opts.pageSize < this.orderList.length };
  }
}
const PLATFORM_UID$3 = "plugin::zhao-deal.platform";
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-deal] 插件已加载");
  const registry = new AdapterRegistry();
  try {
    const platforms = await strapi.documents(PLATFORM_UID$3).findMany({});
    for (const platform2 of platforms) {
      if (!platform2.syncEnabled) continue;
      const cfg = {
        appKey: platform2.appKey || "",
        appSecret: platform2.appSecret || "",
        apiEndpoint: platform2.apiEndpoint || ""
      };
      switch (platform2.code) {
        case "taobao":
          registry.register(new TaobaoAdapter(cfg));
          break;
        case "pdd":
          registry.register(new PddAdapter(cfg));
          break;
        case "douyin":
          registry.register(new DouyinAdapter(cfg));
          break;
        case "jd":
          registry.register(new JdAdapter(cfg));
          break;
      }
    }
  } catch (err) {
    strapi.log.warn(`[zhao-deal] 平台加载失败: ${err.message}`);
  }
  if (strapi.config.get("environment") === "development") {
    registry.register(new MockAdapter());
  }
  strapi.plugin("zhao-deal").service("adapterRegistry", registry);
};
const destroy = ({ strapi }) => {
};
const COUPON_UID$1 = "plugin::zhao-deal.coupon";
const PRODUCT_UID$1 = "plugin::zhao-deal.product";
const CATEGORY_UID$1 = "plugin::zhao-deal.category";
const PLATFORM_UID$2 = "plugin::zhao-deal.platform";
const COLLECTION_UID = "plugin::zhao-deal.coupon-collection";
const SORT_MAP = {
  recommended: "isRecommended:DESC,sortOrder:DESC,endAt:ASC",
  sales: "product.sales30d:DESC",
  price_asc: "product.finalPrice:ASC",
  price_desc: "product.finalPrice:DESC",
  expiring: "endAt:ASC",
  newest: "onlineAt:DESC",
  sort_order: "sortOrder:DESC"
};
const query = ({ strapi }) => {
  const buildBaseFilters = (query2) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const filters = {
      $or: [
        { offlineAt: null },
        { offlineAt: { $gt: now } }
      ],
      $and: [
        { $or: [{ endAt: null }, { endAt: { $gt: now } }] }
      ]
    };
    if (query2.platform) filters.platform = { code: query2.platform };
    if (query2.category) filters.category = { code: query2.category };
    if (query2.brand) filters.product = { brand: query2.brand };
    if (query2.featured === "true") filters.isRecommended = true;
    if (query2.hot === "true") filters.isHot = true;
    if (query2.new === "true") filters.isNew = true;
    if (query2.collection) filters.collection = { code: query2.collection };
    return filters;
  };
  return {
    async listCoupons(query2) {
      const page = parseInt(query2.page) || 1;
      const pageSize = parseInt(query2.pageSize) || 20;
      const sort = SORT_MAP[query2.sort] || SORT_MAP.recommended;
      return strapi.documents(COUPON_UID$1).findMany({
        filters: buildBaseFilters(query2),
        sort,
        page,
        pageSize,
        populate: { platform: true, category: true, product: true }
      });
    },
    async getCoupon(couponId) {
      const results = await strapi.documents(COUPON_UID$1).findMany({
        filters: { couponId },
        populate: { platform: true, category: true, product: true }
      });
      if (!results || results.length === 0) {
        const err = new Error("优惠券不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      return results[0];
    },
    async listProducts(query2) {
      const page = parseInt(query2.page) || 1;
      const pageSize = parseInt(query2.pageSize) || 20;
      const filters = {};
      if (query2.platform) filters.platform = { code: query2.platform };
      if (query2.category) filters.category = { code: query2.category };
      if (query2.brand) filters.brand = query2.brand;
      return strapi.documents(PRODUCT_UID$1).findMany({
        filters,
        page,
        pageSize,
        sort: SORT_MAP[query2.sort] || SORT_MAP.recommended,
        populate: { platform: true, category: true, coupon: true }
      });
    },
    async getProduct(productId) {
      const results = await strapi.documents(PRODUCT_UID$1).findMany({
        filters: { productId }
      });
      if (!results || results.length === 0) {
        const err = new Error("商品不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      return results[0];
    },
    async listCategories(platformCode) {
      const filters = {};
      if (platformCode) filters.platform = { code: platformCode };
      return strapi.documents(CATEGORY_UID$1).findMany({
        filters,
        sort: "sort:ASC",
        populate: { platform: true }
      });
    },
    async listPlatforms() {
      return strapi.documents(PLATFORM_UID$2).findMany({});
    },
    async listCollections() {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      return strapi.documents(COLLECTION_UID).findMany({
        filters: {
          status: true,
          $or: [{ startAt: null }, { startAt: { $lte: now } }],
          $and: [{ $or: [{ endAt: null }, { endAt: { $gte: now } }] }]
        },
        sort: "sortOrder:DESC",
        populate: { coverImage: true }
      });
    },
    async getCollection(code) {
      const results = await strapi.documents(COLLECTION_UID).findMany({
        filters: { code },
        populate: { coupons: { populate: { platform: true, product: true } }, coverImage: true }
      });
      if (!results || results.length === 0) {
        const err = new Error("合集不存在");
        err.code = "DEAL_COLLECTION_NOT_FOUND";
        throw err;
      }
      return results[0];
    }
  };
};
const daysFromNow = (date) => {
  if (!date) return Infinity;
  return Math.floor((date.getTime() - Date.now()) / (24 * 3600 * 1e3));
};
const discountRate = (couponAmount, originalPrice) => {
  if (!couponAmount || !originalPrice || originalPrice <= 0) return 0;
  return couponAmount / originalPrice;
};
const filterCoupons = (list, pf) => {
  if (!pf) return list;
  return list.filter((c) => {
    if (pf.minAmount && (c.couponAmount || 0) < pf.minAmount) return false;
    if (pf.minDiscountRate && discountRate(c.couponAmount, c.originalPrice) < pf.minDiscountRate) return false;
    if (pf.excludeCategories && c.categoryCode && pf.excludeCategories.includes(c.categoryCode)) return false;
    if (pf.minEndAtDays && daysFromNow(c.endAt) > pf.minEndAtDays) return false;
    return true;
  });
};
const filterProducts = (list, pf) => {
  if (!pf) return list;
  return list.filter((p) => {
    if (pf.minSales && (p.sales30d || 0) < pf.minSales) return false;
    if (pf.minReviewScore && (p.reviewScore || 0) < pf.minReviewScore) return false;
    if (pf.minDiscountRate && discountRate(p.couponAmount, p.originalPrice) < pf.minDiscountRate) return false;
    if (pf.excludeBrands && p.brand && pf.excludeBrands.includes(p.brand)) return false;
    return true;
  });
};
const preFilter = () => ({ filterCoupons, filterProducts });
const COUPON_CANDIDATE_UID = "plugin::zhao-deal.coupon-candidate";
const PRODUCT_CANDIDATE_UID = "plugin::zhao-deal.product-candidate";
const COUPON_UID = "plugin::zhao-deal.coupon";
const PRODUCT_UID = "plugin::zhao-deal.product";
const candidate = ({ strapi }) => {
  return {
    async upsertCouponCandidate(batch, platformId, categoryId) {
      const existing = await strapi.documents(COUPON_CANDIDATE_UID).findMany({
        filters: { couponId: batch.couponId, platform: platformId }
      });
      const data = {
        couponId: batch.couponId,
        platform: platformId,
        category: categoryId,
        amountDesc: batch.amountDesc,
        couponAmount: batch.couponAmount,
        useCondition: batch.useCondition,
        useScope: batch.useScope,
        startAt: batch.startAt,
        endAt: batch.endAt,
        receiveCount: batch.receiveCount,
        usedCount: batch.usedCount,
        originalPrice: batch.originalPrice,
        onlineAt: batch.onlineAt,
        offlineAt: batch.offlineAt,
        promoLink: batch.promoLink,
        fetchedAt: /* @__PURE__ */ new Date()
      };
      if (existing && existing.length > 0) {
        const existingDoc = existing[0];
        return strapi.documents(COUPON_CANDIDATE_UID).update({
          documentId: existingDoc.documentId,
          data
        });
      }
      return strapi.documents(COUPON_CANDIDATE_UID).create({ data: { ...data, status: "pending" } });
    },
    async upsertProductCandidate(batch, platformId, categoryId) {
      const existing = await strapi.documents(PRODUCT_CANDIDATE_UID).findMany({
        filters: { productId: batch.productId, platform: platformId }
      });
      const data = {
        productId: batch.productId,
        platform: platformId,
        category: categoryId,
        title: batch.title,
        mainImage: batch.mainImage,
        detailUrl: batch.detailUrl,
        originalPrice: batch.originalPrice,
        couponAmount: batch.couponAmount,
        finalPrice: batch.finalPrice,
        sales30d: batch.sales30d,
        reviewCount: batch.reviewCount,
        reviewScore: batch.reviewScore,
        brand: batch.brand,
        fetchedAt: /* @__PURE__ */ new Date()
      };
      if (existing && existing.length > 0) {
        return strapi.documents(PRODUCT_CANDIDATE_UID).update({
          documentId: existing[0].documentId,
          data
        });
      }
      return strapi.documents(PRODUCT_CANDIDATE_UID).create({ data: { ...data, status: "pending" } });
    },
    async approveCouponCandidate(documentId) {
      const candidate2 = await strapi.documents(COUPON_CANDIDATE_UID).findOne({ documentId });
      if (!candidate2) {
        const err = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate2.status === "imported") {
        const err = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }
      const newCoupon = await strapi.documents(COUPON_UID).create({
        data: {
          couponId: candidate2.couponId,
          platform: candidate2.platform?.documentId,
          category: candidate2.category?.documentId,
          amountDesc: candidate2.amountDesc,
          useCondition: candidate2.useCondition,
          useScope: candidate2.useScope,
          startAt: candidate2.startAt,
          endAt: candidate2.endAt,
          receiveCount: candidate2.receiveCount,
          usedCount: candidate2.usedCount,
          originalPrice: candidate2.originalPrice,
          onlineAt: candidate2.onlineAt,
          offlineAt: candidate2.offlineAt,
          promoLink: candidate2.promoLink
        }
      });
      if (candidate2.couponId) {
        const productCandidate2 = await strapi.documents(PRODUCT_CANDIDATE_UID).findMany({
          filters: { productId: candidate2.couponId, status: "imported" }
        });
        if (productCandidate2 && productCandidate2.length > 0 && productCandidate2[0].importedProduct) {
          await strapi.documents(PRODUCT_UID).update({
            documentId: productCandidate2[0].importedProduct.documentId,
            data: { coupon: newCoupon.documentId }
          });
        }
      }
      await strapi.documents(COUPON_CANDIDATE_UID).update({
        documentId,
        data: { status: "imported", importedCoupon: newCoupon.documentId }
      });
      return newCoupon;
    },
    async rejectCouponCandidate(documentId, reason) {
      const candidate2 = await strapi.documents(COUPON_CANDIDATE_UID).findOne({ documentId });
      if (!candidate2) {
        const err = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate2.status === "imported") {
        const err = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }
      return strapi.documents(COUPON_CANDIDATE_UID).update({
        documentId,
        data: { status: "rejected", rejectReason: reason }
      });
    },
    async approveProductCandidate(documentId) {
      const candidate2 = await strapi.documents(PRODUCT_CANDIDATE_UID).findOne({ documentId });
      if (!candidate2) {
        const err = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate2.status === "imported") {
        const err = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }
      const newProduct = await strapi.documents(PRODUCT_UID).create({
        data: {
          productId: candidate2.productId,
          platform: candidate2.platform?.documentId,
          category: candidate2.category?.documentId,
          title: candidate2.title,
          mainImage: candidate2.mainImage,
          detailUrl: candidate2.detailUrl,
          originalPrice: candidate2.originalPrice,
          couponAmount: candidate2.couponAmount,
          finalPrice: candidate2.finalPrice,
          sales30d: candidate2.sales30d,
          reviewCount: candidate2.reviewCount,
          reviewScore: candidate2.reviewScore,
          brand: candidate2.brand
        }
      });
      await strapi.documents(PRODUCT_CANDIDATE_UID).update({
        documentId,
        data: { status: "imported", importedProduct: newProduct.documentId }
      });
      return newProduct;
    }
  };
};
const PLATFORM_UID$1 = "plugin::zhao-deal.platform";
const CATEGORY_UID = "plugin::zhao-deal.category";
const resolveTimeRange = (timeRange, customStart, customEnd) => {
  const now = /* @__PURE__ */ new Date();
  switch (timeRange) {
    case "last_24h":
      return { startTime: new Date(now.getTime() - 24 * 3600 * 1e3), endTime: now };
    case "last_7d":
      return { startTime: new Date(now.getTime() - 7 * 24 * 3600 * 1e3), endTime: now };
    case "last_30d":
      return { startTime: new Date(now.getTime() - 30 * 24 * 3600 * 1e3), endTime: now };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const ye = new Date(y);
      ye.setHours(23, 59, 59, 999);
      return { startTime: y, endTime: ye };
    }
    case "today": {
      const t = new Date(now);
      t.setHours(0, 0, 0, 0);
      return { startTime: t, endTime: now };
    }
    case "custom":
      return { startTime: new Date(customStart), endTime: new Date(customEnd) };
    default:
      return { startTime: void 0, endTime: void 0 };
  }
};
const sync = ({ strapi }) => {
  const mergeConditions = (fetchConfig, conditions) => {
    if (!conditions) return fetchConfig;
    return { ...fetchConfig, ...conditions };
  };
  const resolveCategoryId = async (categoryCode, platformId) => {
    const cats = await strapi.documents(CATEGORY_UID).findMany({
      filters: { code: categoryCode, platform: platformId }
    });
    return cats && cats.length > 0 ? cats[0].documentId : void 0;
  };
  return {
    async syncPlatformData(opts) {
      const { platformCode, type, conditions } = opts;
      const startedAt = Date.now();
      const platforms = await strapi.documents(PLATFORM_UID$1).findMany({
        filters: { code: platformCode }
      });
      if (!platforms || platforms.length === 0) {
        const err = new Error(`平台不存在: ${platformCode}`);
        err.code = "DEAL_ADAPTER_NOT_FOUND";
        throw err;
      }
      const platform2 = platforms[0];
      const fetchConfig = platform2.fetchConfig?.[type] || {};
      const merged = mergeConditions(fetchConfig, conditions);
      const { startTime, endTime } = resolveTimeRange(
        merged.timeRange,
        merged.customStart,
        merged.customEnd
      );
      const dealPlugin = strapi.plugin("zhao-deal");
      const registry = dealPlugin.service("adapterRegistry");
      const adapter = registry.get(platformCode);
      const preFilterService = strapi.plugin("zhao-deal").service("pre-filter");
      const candidateService = strapi.plugin("zhao-deal").service("candidate");
      let fetched = 0;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];
      let pageNo = 1;
      const pageSize = merged.pageSize || 100;
      while (true) {
        try {
          let result;
          if (type === "coupons") {
            result = await adapter.fetchCoupons({
              pageSize,
              pageNo,
              startTime,
              endTime,
              categoryCodes: merged.categoryCodes,
              minAmount: merged.minAmount,
              onlyRecommended: merged.onlyRecommended
            });
            const filtered = preFilterService.filterCoupons(result.list, merged.preFilter);
            for (const item of filtered) {
              fetched++;
              const catId = item.categoryCode ? await resolveCategoryId(item.categoryCode, platform2.documentId) : void 0;
              try {
                const r = await candidateService.upsertCouponCandidate(item, platform2.documentId, catId);
                if (r && r.status === "pending" && r.documentId) created++;
                else updated++;
              } catch (e) {
                errors.push(`coupon ${item.couponId}: ${e.message}`);
              }
            }
          } else {
            result = await adapter.fetchProducts({
              pageSize,
              pageNo,
              startTime,
              endTime,
              categoryCodes: merged.categoryCodes,
              minSales: merged.minSales
            });
            const filtered = preFilterService.filterProducts(result.list, merged.preFilter);
            for (const item of filtered) {
              fetched++;
              const catId = item.categoryCode ? await resolveCategoryId(item.categoryCode, platform2.documentId) : void 0;
              try {
                const r = await candidateService.upsertProductCandidate(item, platform2.documentId, catId);
                if (r && r.status === "pending" && r.documentId) created++;
                else updated++;
              } catch (e) {
                errors.push(`product ${item.productId}: ${e.message}`);
              }
            }
          }
          if (!result.hasNext) break;
          pageNo++;
        } catch (e) {
          errors.push(`page ${pageNo}: ${e.message}`);
          break;
        }
      }
      return {
        platformCode,
        type,
        fetched,
        created,
        updated,
        skipped,
        errors,
        duration: Date.now() - startedAt
      };
    }
  };
};
const PLATFORM_UID = "plugin::zhao-deal.platform";
const syncScheduler = ({ strapi }) => {
  const getStore = () => strapi.store({ type: "plugin", name: "zhao-deal" });
  return {
    async shouldRunNow(platformCode, syncCron) {
      if (!syncCron) return false;
      const storeKey = `sync_last_run::${platformCode}`;
      const lastRunStr = await getStore().get({ key: storeKey });
      const lastRun = lastRunStr ? new Date(lastRunStr) : /* @__PURE__ */ new Date(0);
      try {
        const parser = cronParser.parseExpression(syncCron, { currentDate: lastRun });
        const nextRun = parser.next().toDate();
        const now = /* @__PURE__ */ new Date();
        if (now >= nextRun && now.getTime() - lastRun.getTime() > 60 * 1e3) {
          await getStore().set({ key: storeKey, value: now.toISOString() });
          return true;
        }
      } catch (err) {
        strapi.log.warn(`[zhao-deal] 无效 cron 表达式 ${syncCron}: ${err.message}`);
      }
      return false;
    },
    async getLastRun(platformCode) {
      const v = await getStore().get({ key: `sync_last_run::${platformCode}` });
      return v ? new Date(v) : null;
    },
    /**
     * 扫描所有 syncEnabled + syncMode in ['scheduled','both'] 的平台，
     * 对到期的平台触发优惠券 + 产品同步（候选机制，结果进入 pending 等待人工审核）
     */
    async run() {
      let platforms = [];
      try {
        platforms = await strapi.documents(PLATFORM_UID).findMany({
          filters: { syncEnabled: true, syncMode: { $in: ["scheduled", "both"] } }
        });
      } catch (err) {
        strapi.log.warn(`[zhao-deal sync-scheduler] load platforms failed: ${err.message}`);
        return { processed: 0 };
      }
      let processed = 0;
      for (const platform2 of platforms) {
        try {
          const should = await this.shouldRunNow(platform2.code, platform2.syncCron);
          if (!should) continue;
          const syncService = strapi.plugin("zhao-deal").service("sync");
          let platformFailed = false;
          let couponStats;
          try {
            couponStats = await syncService.syncPlatformData({
              platformCode: platform2.code,
              type: "coupons"
            });
          } catch (err) {
            platformFailed = true;
            strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform2.code} coupons failed: ${err.message}`);
          }
          let productStats;
          try {
            productStats = await syncService.syncPlatformData({
              platformCode: platform2.code,
              type: "products"
            });
          } catch (err) {
            platformFailed = true;
            strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform2.code} products failed: ${err.message}`);
          }
          if (!platformFailed) {
            strapi.log.info(
              `[zhao-deal sync-scheduler] ${platform2.code}: coupons(fetched=${couponStats.fetched} created=${couponStats.created} updated=${couponStats.updated}) products(fetched=${productStats.fetched} created=${productStats.created} updated=${productStats.updated})`
            );
            processed++;
          }
        } catch (err) {
          strapi.log.warn(`[zhao-deal sync-scheduler] platform ${platform2.code} failed: ${err.message}`);
        }
      }
      return { processed };
    }
  };
};
const services = {
  query,
  "pre-filter": preFilter,
  candidate,
  sync,
  syncScheduler
};
const publicRoute = (method, path, handler) => ({
  method,
  path,
  handler,
  config: { auth: false }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    publicRoute("GET", "/coupons", "coupon.list"),
    publicRoute("GET", "/coupons/:couponId", "coupon.get"),
    publicRoute("GET", "/products", "product.list"),
    publicRoute("GET", "/products/:productId", "product.get"),
    publicRoute("GET", "/categories", "meta.categories"),
    publicRoute("GET", "/platforms", "meta.platforms"),
    publicRoute("GET", "/collections", "coupon.listCollections"),
    publicRoute("GET", "/collections/:code", "coupon.getCollection")
  ]
});
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } }
    ]
  }
});
const adminApi = () => ({
  type: "content-api",
  routes: [
    adminRoute("POST", "/sync/trigger", "admin-sync.trigger", "zhao-deal.sync.trigger"),
    adminRoute("POST", "/coupon-candidates/:documentId/approve", "candidate.approve", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/:documentId/reject", "candidate.reject", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/product-candidates/:documentId/approve", "candidate.approveProduct", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/batch-approve", "candidate.batchApprove", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/batch-reject", "candidate.batchReject", "zhao-deal.candidate.approve")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...contentApi().routes, ...adminApi().routes]
  }
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
export {
  index as default
};
