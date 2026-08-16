type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const apiRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    apiRoute("POST", "/upload", "api-controller.upload", "oss.upload"),
    apiRoute("GET", "/media/list", "api-controller.mediaList", "oss.read"),
    apiRoute("GET", "/media/folders", "api-controller.getFolders", "oss.read"),
    apiRoute("POST", "/media/folders", "api-controller.createFolder", "oss.upload"),
    apiRoute("GET", "/sync/status/:fileId", "api-controller.getSyncStatus", "oss.read"),
    apiRoute("GET", "/media/:fileId/references", "api-controller.getReferences", "oss.read"),
    apiRoute("DELETE", "/media/:fileId", "api-controller.deleteMedia", "oss.delete"),
    // 媒体鉴权播放：签发需登录；流式交付由签名+过期时间校验（<video> 无法带 Authorization 头）
    {
      method: "POST",
      path: "/v1/media/stream-token",
      handler: "api-controller.issueStreamToken",
      config: {
        auth: false,
        policies: ["plugin::zhao-auth.is-authenticated"],
      },
    },
    {
      method: "GET",
      path: "/v1/media/stream",
      handler: "api-controller.streamMedia",
      config: { auth: false, policies: [] },
    },
    {
      method: "HEAD",
      path: "/v1/media/stream",
      handler: "api-controller.streamMedia",
      config: { auth: false, policies: [] },
    },
  ],
});
