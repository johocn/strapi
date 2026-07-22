"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adminRoute = (method, path, handler, permission) => ({
    method,
    path: `/v1/admin${path}`,
    handler,
    config: {
        auth: false,
        policies: [
            "plugin::zhao-auth.is-authenticated",
            { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
        ],
    },
});
exports.default = () => ({
    type: "content-api",
    routes: [
        adminRoute("GET", "/sync/dashboard", "sync-controller.getDashboard", "oss.read"),
        adminRoute("GET", "/sync/records", "sync-controller.getSyncRecords", "oss.read"),
        adminRoute("POST", "/sync/trigger", "sync-controller.triggerSync", "oss.upload"),
        adminRoute("POST", "/sync/batch", "sync-controller.batchSync", "oss.upload"),
        adminRoute("DELETE", "/sync/remote/:recordId", "sync-controller.deleteRemote", "oss.delete"),
        adminRoute("GET", "/sync/health", "sync-controller.checkHealth", "oss.read"),
        adminRoute("GET", "/settings", "settings-controller.getConfig", "oss.read"),
        adminRoute("PUT", "/settings", "settings-controller.updateConfig", "oss.upload"),
        adminRoute("POST", "/settings/test-provider", "settings-controller.testProvider", "oss.upload"),
        adminRoute("POST", "/repair/folders", "api-controller.repairFolders", "oss.upload"),
    ],
});
