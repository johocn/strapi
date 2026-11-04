type Method = "GET" | "POST";

const route = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    route("GET", "/site", "site.get"),
    route("GET", "/slots", "order.slots"),
    route("POST", "/orders", "order.create"),
    route("GET", "/orders/:orderNo", "order.detail"),
    route("POST", "/orders/:orderNo/renew", "order.renew"),
    route("POST", "/orders/:orderNo/outbound", "order.requestOutbound"),
    route("GET", "/my/me", "my.me"),
    route("GET", "/my/orders", "my.orders"),
    route("GET", "/my/referral", "my.referral"),
    route("GET", "/my/rewards", "my.rewards"),
    route("GET", "/my/share-records", "my.shareRecords"),
    route("POST", "/pay/prepay", "pay.prepay"),
    route("POST", "/pay/notify", "pay.notify"),
    route("POST", "/pay/mock-pay", "pay.mockPay"),
    route("GET", "/referral/:code/preview", "referral.preview"),
    route("GET", "/agreement", "content.agreement"),
    route("GET", "/faqs", "content.faqs"),
  ],
});
