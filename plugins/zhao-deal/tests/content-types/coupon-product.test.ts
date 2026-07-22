import couponSchema from "../../server/src/content-types/coupon/schema.json";
import productSchema from "../../server/src/content-types/product/schema.json";

describe("Coupon 内容类型", () => {
  it("couponId 唯一且必填", () => {
    const attr = couponSchema.attributes.couponId as any;
    expect(attr.required).toBe(true);
    expect(attr.unique).toBe(true);
  });

  it("promoLink 必填", () => {
    expect((couponSchema.attributes.promoLink as any).required).toBe(true);
  });

  it("包含 isRecommended/isHot/isNew 默认 false", () => {
    expect((couponSchema.attributes.isRecommended as any).default).toBe(false);
    expect((couponSchema.attributes.isHot as any).default).toBe(false);
    expect((couponSchema.attributes.isNew as any).default).toBe(false);
  });
});

describe("Product 与 Coupon 的 oneToOne 关系", () => {
  it("Product.coupon 为 oneToOne 指向 zhao-deal.coupon", () => {
    const attr = productSchema.attributes.coupon as any;
    expect(attr.type).toBe("relation");
    expect(attr.relation).toBe("oneToOne");
    expect(attr.target).toBe("plugin::zhao-deal.coupon");
  });
});
