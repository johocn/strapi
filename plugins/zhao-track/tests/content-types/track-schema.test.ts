import sourceTag from "../../server/src/content-types/source-tag/schema.json";
import clickEvent from "../../server/src/content-types/click-event/schema.json";
import order from "../../server/src/content-types/order/schema.json";

describe("SourceTag", () => {
  it("tagId 唯一必填", () => {
    expect((sourceTag.attributes.tagId as any).unique).toBe(true);
    expect((sourceTag.attributes.tagId as any).required).toBe(true);
  });
  it("包含 promoCampaign 关系指向 plugin::zhao-studio.promo-campaign", () => {
    const attr = sourceTag.attributes.promoCampaign as any;
    expect(attr.relation).toBe("manyToOne");
    expect(attr.target).toBe("plugin::zhao-studio.promo-campaign");
  });
});

describe("ClickEvent 跨插件 relation", () => {
  it("coupon 关系指向 plugin::zhao-deal.coupon", () => {
    const attr = clickEvent.attributes.coupon as any;
    expect(attr.target).toBe("plugin::zhao-deal.coupon");
    expect(attr.relation).toBe("manyToOne");
  });
  it("包含 promoPid 字段", () => {
    expect((clickEvent.attributes.promoPid as any).type).toBe("string");
  });
});

describe("Order 归因字段", () => {
  it("orderId 唯一", () => {
    expect((order.attributes.orderId as any).unique).toBe(true);
  });
  it("promoPid 为归因核心字段", () => {
    expect((order.attributes.promoPid as any).type).toBe("string");
  });
  it("attributionQuality 枚举含 5 个值", () => {
    const attr = order.attributes.attributionQuality as any;
    expect(attr.enum).toEqual(["pid_match", "click_match", "weak_match", "fallback_match", "unmatched"]);
    expect(attr.default).toBe("unmatched");
  });
});
