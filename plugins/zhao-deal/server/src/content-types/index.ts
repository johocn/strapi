import platform from "./platform/schema.json";
import category from "./category/schema.json";
import coupon from "./coupon/schema.json";
import product from "./product/schema.json";
import couponCandidate from "./coupon-candidate/schema.json";
import productCandidate from "./product-candidate/schema.json";
import couponCollection from "./coupon-collection/schema.json";

export default {
  platform: { schema: platform },
  category: { schema: category },
  coupon: { schema: coupon },
  product: { schema: product },
  "coupon-candidate": { schema: couponCandidate },
  "product-candidate": { schema: productCandidate },
  "coupon-collection": { schema: couponCollection },
};
