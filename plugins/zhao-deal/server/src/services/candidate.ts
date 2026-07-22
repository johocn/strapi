import type { Core } from "@strapi/strapi";
import type { CouponBatch, ProductBatch } from "./adapters/platform-adapter";

const COUPON_CANDIDATE_UID = "plugin::zhao-deal.coupon-candidate";
const PRODUCT_CANDIDATE_UID = "plugin::zhao-deal.product-candidate";
const COUPON_UID = "plugin::zhao-deal.coupon";
const PRODUCT_UID = "plugin::zhao-deal.product";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async upsertCouponCandidate(batch: CouponBatch, platformId: string, categoryId?: string) {
      const existing = await strapi.documents(COUPON_CANDIDATE_UID).findMany({
        filters: { couponId: batch.couponId, platform: platformId },
      });
      const data: any = {
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
        fetchedAt: new Date(),
      };
      if (existing && existing.length > 0) {
        const existingDoc = existing[0];
        return strapi.documents(COUPON_CANDIDATE_UID).update({
          documentId: existingDoc.documentId,
          data,
        });
      }
      return strapi.documents(COUPON_CANDIDATE_UID).create({ data: { ...data, status: "pending" } });
    },

    async upsertProductCandidate(batch: ProductBatch, platformId: string, categoryId?: string) {
      const existing = await strapi.documents(PRODUCT_CANDIDATE_UID).findMany({
        filters: { productId: batch.productId, platform: platformId },
      });
      const data: any = {
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
        fetchedAt: new Date(),
      };
      if (existing && existing.length > 0) {
        return strapi.documents(PRODUCT_CANDIDATE_UID).update({
          documentId: existing[0].documentId,
          data,
        });
      }
      return strapi.documents(PRODUCT_CANDIDATE_UID).create({ data: { ...data, status: "pending" } });
    },

    async approveCouponCandidate(documentId: string) {
      const candidate = await strapi.documents(COUPON_CANDIDATE_UID).findOne({ documentId });
      if (!candidate) {
        const err: any = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate.status === "imported") {
        const err: any = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }

      const newCoupon = await strapi.documents(COUPON_UID).create({
        data: {
          couponId: candidate.couponId,
          platform: candidate.platform?.documentId,
          category: candidate.category?.documentId,
          amountDesc: candidate.amountDesc,
          useCondition: candidate.useCondition,
          useScope: candidate.useScope,
          startAt: candidate.startAt,
          endAt: candidate.endAt,
          receiveCount: candidate.receiveCount,
          usedCount: candidate.usedCount,
          originalPrice: candidate.originalPrice,
          onlineAt: candidate.onlineAt,
          offlineAt: candidate.offlineAt,
          promoLink: candidate.promoLink,
        },
      });

      if (candidate.couponId) {
        const productCandidate = await strapi.documents(PRODUCT_CANDIDATE_UID).findMany({
          filters: { productId: candidate.couponId, status: "imported" },
        });
        if (productCandidate && productCandidate.length > 0 && productCandidate[0].importedProduct) {
          await strapi.documents(PRODUCT_UID).update({
            documentId: productCandidate[0].importedProduct.documentId,
            data: { coupon: newCoupon.documentId } as any,
          });
        }
      }

      await strapi.documents(COUPON_CANDIDATE_UID).update({
        documentId,
        data: { status: "imported", importedCoupon: newCoupon.documentId } as any,
      });

      return newCoupon;
    },

    async rejectCouponCandidate(documentId: string, reason: string) {
      const candidate = await strapi.documents(COUPON_CANDIDATE_UID).findOne({ documentId });
      if (!candidate) {
        const err: any = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate.status === "imported") {
        const err: any = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }
      return strapi.documents(COUPON_CANDIDATE_UID).update({
        documentId,
        data: { status: "rejected", rejectReason: reason } as any,
      });
    },

    async approveProductCandidate(documentId: string) {
      const candidate = await strapi.documents(PRODUCT_CANDIDATE_UID).findOne({ documentId });
      if (!candidate) {
        const err: any = new Error("候选记录不存在");
        err.code = "DEAL_CANDIDATE_NOT_FOUND";
        throw err;
      }
      if (candidate.status === "imported") {
        const err: any = new Error("候选已导入");
        err.code = "DEAL_CANDIDATE_ALREADY_IMPORTED";
        throw err;
      }
      const newProduct = await strapi.documents(PRODUCT_UID).create({
        data: {
          productId: candidate.productId,
          platform: candidate.platform?.documentId,
          category: candidate.category?.documentId,
          title: candidate.title,
          mainImage: candidate.mainImage,
          detailUrl: candidate.detailUrl,
          originalPrice: candidate.originalPrice,
          couponAmount: candidate.couponAmount,
          finalPrice: candidate.finalPrice,
          sales30d: candidate.sales30d,
          reviewCount: candidate.reviewCount,
          reviewScore: candidate.reviewScore,
          brand: candidate.brand,
        },
      });
      await strapi.documents(PRODUCT_CANDIDATE_UID).update({
        documentId,
        data: { status: "imported", importedProduct: newProduct.documentId } as any,
      });
      return newProduct;
    },
  };
};
