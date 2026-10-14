// 服务间管理路由（vendure/web-admin → strapi），不走 zhao-auth（无登录态）。
// type: "admin" + auth: false → strapi 5.47 源码确认完全跳过鉴权（services/auth/index.mjs），
// 匿名可达；真正的鉴权由控制器校验请求头 x-zhao-secret == process.env.ZHAO_SEARCH_SHARED_SECRET。
// router 级 prefix 置空（register-routes.mjs 仅对 nullish 前缀补 /{pluginName}），
// 最终挂载路径即声明的 path：POST /v1/zhao-search/reindex、GET /v1/zhao-search/health。
export default () => ({
  type: "admin" as const,
  prefix: "",
  routes: [
    {
      method: "POST",
      path: "/v1/zhao-search/reindex",
      handler: "admin-reindex.reindex",
      config: { auth: false, policies: [] },
    },
    {
      method: "GET",
      path: "/v1/zhao-search/health",
      handler: "admin-reindex.health",
      config: { auth: false, policies: [] },
    },
  ],
});
