import { CouponBatch, ProductBatch } from './adapters/platform-adapter';
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
export declare const filterCoupons: (list: CouponBatch[], pf?: CouponPreFilter) => CouponBatch[];
export declare const filterProducts: (list: ProductBatch[], pf?: ProductPreFilter) => ProductBatch[];
declare const _default: () => {
    filterCoupons: (list: CouponBatch[], pf?: CouponPreFilter) => CouponBatch[];
    filterProducts: (list: ProductBatch[], pf?: ProductPreFilter) => ProductBatch[];
};
export default _default;
