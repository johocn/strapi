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
  ],
});
