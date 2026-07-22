type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    // ===== 公开路由（无鉴权） =====
    publicRoute("POST", "/zhao-track/click", "click.click"),
    publicRoute("POST", "/zhao-track/source/identify", "source.identify"),

    // ===== 用户路由（需登录） =====
    userRoute("GET", "/zhao-track/clicks", "query.clicks"),
    userRoute("GET", "/zhao-track/orders", "query.orders"),
    userRoute("GET", "/zhao-track/source-tags", "query.sourceTags"),
    userRoute("GET", "/zhao-track/attribution/report", "report.attributionReport"),
  ],
});
