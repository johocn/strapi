import type { CouponBatch, ProductBatch } from "./adapters/platform-adapter";

export interface CouponPreFilter {
  minAmount?: number;
  minDiscountRate?: number;
  excludeCategories?: string[];
  minEndAtDays?: number;
}

export interface ProductPreFilter {
  minSales?: number;
  minReviewScore?: number;
  minDiscountRate?: number;
  excludeBrands?: string[];
}

const daysFromNow = (date?: Date): number => {
  if (!date) return Infinity;
  return Math.floor((date.getTime() - Date.now()) / (24 * 3600 * 1000));
};

const discountRate = (couponAmount?: number, originalPrice?: number): number => {
  if (!couponAmount || !originalPrice || originalPrice <= 0) return 0;
  return couponAmount / originalPrice;
};

export const filterCoupons = (list: CouponBatch[], pf?: CouponPreFilter): CouponBatch[] => {
  if (!pf) return list;
  return list.filter((c) => {
    if (pf.minAmount && (c.couponAmount || 0) < pf.minAmount) return false;
    if (pf.minDiscountRate && discountRate(c.couponAmount, c.originalPrice) < pf.minDiscountRate) return false;
    if (pf.excludeCategories && c.categoryCode && pf.excludeCategories.includes(c.categoryCode)) return false;
    if (pf.minEndAtDays && daysFromNow(c.endAt) > pf.minEndAtDays) return false;
    return true;
  });
};

export const filterProducts = (list: ProductBatch[], pf?: ProductPreFilter): ProductBatch[] => {
  if (!pf) return list;
  return list.filter((p) => {
    if (pf.minSales && (p.sales30d || 0) < pf.minSales) return false;
    if (pf.minReviewScore && (p.reviewScore || 0) < pf.minReviewScore) return false;
    if (pf.minDiscountRate && discountRate(p.couponAmount, p.originalPrice) < pf.minDiscountRate) return false;
    if (pf.excludeBrands && p.brand && pf.excludeBrands.includes(p.brand)) return false;
    return true;
  });
};

export default () => ({ filterCoupons, filterProducts });
