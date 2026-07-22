type Method = "GET" | "POST" | "PUT" | "DELETE";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path,
  handler,
  config: { auth: false },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    publicRoute("GET", "/coupons", "coupon.list"),
    publicRoute("GET", "/coupons/:couponId", "coupon.get"),
    publicRoute("GET", "/products", "product.list"),
    publicRoute("GET", "/products/:productId", "product.get"),
    publicRoute("GET", "/categories", "meta.categories"),
    publicRoute("GET", "/platforms", "meta.platforms"),
    publicRoute("GET", "/collections", "coupon.listCollections"),
    publicRoute("GET", "/collections/:code", "coupon.getCollection"),
  ],
});
