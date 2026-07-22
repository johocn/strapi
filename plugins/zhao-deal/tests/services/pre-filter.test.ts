import { filterCoupons, filterProducts } from "../../server/src/services/pre-filter";
import type { CouponBatch, ProductBatch } from "../../server/src/services/adapters/platform-adapter";

const coupons: CouponBatch[] = [
  { couponId: "c1", amountDesc: "减 5", couponAmount: 5, originalPrice: 100, promoLink: "l", endAt: new Date(Date.now() + 3 * 86400000), categoryCode: "daily" },
  { couponId: "c2", amountDesc: "减 20", couponAmount: 20, originalPrice: 100, promoLink: "l", endAt: new Date(Date.now() + 30 * 86400000), categoryCode: "clothing" },
  { couponId: "c3", amountDesc: "减 2", couponAmount: 2, originalPrice: 100, promoLink: "l", categoryCode: "adult" },
];

const products: ProductBatch[] = [
  { productId: "p1", title: "A", sales30d: 200, reviewScore: 4.5, originalPrice: 100, couponAmount: 20, brand: "BrandX" },
  { productId: "p2", title: "B", sales30d: 50, reviewScore: 3.0, originalPrice: 100, couponAmount: 5, brand: "BrandY" },
];

describe("filterCoupons", () => {
  it("按 minAmount 过滤", () => {
    expect(filterCoupons(coupons, { minAmount: 10 })).toHaveLength(1);
  });

  it("按 minDiscountRate 过滤", () => {
    expect(filterCoupons(coupons, { minDiscountRate: 0.15 })).toHaveLength(1);
  });

  it("按 excludeCategories 过滤", () => {
    expect(filterCoupons(coupons, { excludeCategories: ["adult"] })).toHaveLength(2);
  });

  it("按 minEndAtDays 过滤", () => {
    expect(filterCoupons(coupons, { minEndAtDays: 7 })).toHaveLength(1);
  });
});

describe("filterProducts", () => {
  it("按 minSales 过滤", () => {
    expect(filterProducts(products, { minSales: 100 })).toHaveLength(1);
  });

  it("按 minReviewScore 过滤", () => {
    expect(filterProducts(products, { minReviewScore: 4.0 })).toHaveLength(1);
  });

  it("按 excludeBrands 过滤", () => {
    expect(filterProducts(products, { excludeBrands: ["BrandX"] })).toHaveLength(1);
  });
});
