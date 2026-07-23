import type { Core } from "@strapi/strapi";

const COUPON_UID = "plugin::zhao-deal.coupon";
const PRODUCT_UID = "plugin::zhao-deal.product";
const CATEGORY_UID = "plugin::zhao-deal.category";
const PLATFORM_UID = "plugin::zhao-deal.platform";
const COLLECTION_UID = "plugin::zhao-deal.coupon-collection";

const SORT_MAP: Record<string, string> = {
  recommended: "isRecommended:DESC,sortOrder:DESC,endAt:ASC",
  sales: "product.sales30d:DESC",
  price_asc: "product.finalPrice:ASC",
  price_desc: "product.finalPrice:DESC",
  expiring: "endAt:ASC",
  newest: "onlineAt:DESC",
  sort_order: "sortOrder:DESC",
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const buildBaseFilters = (query: any) => {
    const now = new Date().toISOString();
    const filters: any = {
      $or: [
        { offlineAt: null },
        { offlineAt: { $gt: now } },
      ],
      $and: [
        { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
      ],
    };
    if (query.platform) filters.platform = { code: query.platform };
    if (query.category) filters.category = { code: query.category };
    if (query.brand) filters.product = { brand: query.brand };
    if (query.featured === "true") filters.isRecommended = true;
    if (query.hot === "true") filters.isHot = true;
    if (query.new === "true") filters.isNew = true;
    if (query.collection) filters.collection = { code: query.collection };
    return filters;
  };

  return {
    async listCoupons(query: any) {
      const page = parseInt(query.page) || 1;
      const pageSize = parseInt(query.pageSize) || 20;
      const sort = SORT_MAP[query.sort] || SORT_MAP.recommended;
      return strapi.documents(COUPON_UID).findMany({
        filters: buildBaseFilters(query),
        sort,
        page,
        pageSize,
        populate: { platform: { fields: ["name", "code"] }, category: true, product: true },
      });
    },

    async getCoupon(couponId: string) {
      const results = await strapi.documents(COUPON_UID).findMany({
        filters: { couponId },
        populate: { platform: { fields: ["name", "code"] }, category: true, product: true },
      });
      if (!results || results.length === 0) {
        const err: any = new Error("优惠券不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      return results[0];
    },

    async listProducts(query: any) {
      const page = parseInt(query.page) || 1;
      const pageSize = parseInt(query.pageSize) || 20;
      const filters: any = {};
      if (query.platform) filters.platform = { code: query.platform };
      if (query.category) filters.category = { code: query.category };
      if (query.brand) filters.brand = query.brand;
      return strapi.documents(PRODUCT_UID).findMany({
        filters, page, pageSize,
        sort: SORT_MAP[query.sort] || SORT_MAP.recommended,
        populate: { platform: { fields: ["name", "code"] }, category: true, coupon: true },
      });
    },

    async getProduct(productId: string) {
      const results = await strapi.documents(PRODUCT_UID).findMany({
        filters: { productId },
      });
      if (!results || results.length === 0) {
        const err: any = new Error("商品不存在");
        err.code = "DEAL_COUPON_NOT_FOUND";
        throw err;
      }
      return results[0];
    },

    async listCategories(platformCode?: string) {
      const filters: any = {};
      if (platformCode) filters.platform = { code: platformCode };
      return strapi.documents(CATEGORY_UID).findMany({
        filters,
        sort: "sort:ASC",
        populate: { platform: { fields: ["name", "code"] } },
      });
    },

    async listPlatforms() {
      return strapi.documents(PLATFORM_UID).findMany({
        fields: ["name", "code", "promoSite"],
      });
    },

    async listCollections() {
      const now = new Date().toISOString();
      return strapi.documents(COLLECTION_UID).findMany({
        filters: {
          status: true,
          $or: [{ startAt: null }, { startAt: { $lte: now } }],
          $and: [{ $or: [{ endAt: null }, { endAt: { $gte: now } }] }],
        },
        sort: "sortOrder:DESC",
        populate: { coverImage: true },
      });
    },

    async getCollection(code: string) {
      const results = await strapi.documents(COLLECTION_UID).findMany({
        filters: { code },
        populate: { coupons: { populate: { platform: { fields: ["name", "code"] }, product: true } }, coverImage: true },
      });
      if (!results || results.length === 0) {
        const err: any = new Error("合集不存在");
        err.code = "DEAL_COLLECTION_NOT_FOUND";
        throw err;
      }
      return results[0];
    },
  };
};
