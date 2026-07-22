import couponCandidate from "../../server/src/content-types/coupon-candidate/schema.json";
import collection from "../../server/src/content-types/coupon-collection/schema.json";

describe("CouponCandidate 内容类型", () => {
  it("status 枚举含 4 个状态且默认 pending", () => {
    const attr = couponCandidate.attributes.status as any;
    expect(attr.enum).toEqual(["pending", "approved", "rejected", "imported"]);
    expect(attr.default).toBe("pending");
  });

  it("包含 couponAmount 字段（预筛选用）", () => {
    expect((couponCandidate.attributes.couponAmount as any).type).toBe("decimal");
  });

  it("importedCoupon 为 oneToOne 指向 coupon", () => {
    const attr = couponCandidate.attributes.importedCoupon as any;
    expect(attr.relation).toBe("oneToOne");
    expect(attr.target).toBe("plugin::zhao-deal.coupon");
  });
});

describe("CouponCollection 生效期字段", () => {
  it("startAt/endAt 均为 datetime 且非必填（空表示永久）", () => {
    expect((collection.attributes.startAt as any).type).toBe("datetime");
    expect((collection.attributes.startAt as any).required).toBeUndefined();
    expect((collection.attributes.endAt as any).type).toBe("datetime");
    expect((collection.attributes.endAt as any).required).toBeUndefined();
  });

  it("status 默认 true", () => {
    expect((collection.attributes.status as any).default).toBe(true);
  });
});
