"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apiRoute = (method, path, handler, permission) => ({
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
exports.default = () => ({
    type: "content-api",
    routes: [
        apiRoute("POST", "/upload", "api-controller.upload", "oss.upload"),
        apiRoute("GET", "/media/list", "api-controller.mediaList", "oss.read"),
        apiRoute("GET", "/media/folders", "api-controller.getFolders", "oss.read"),
        apiRoute("POST", "/media/folders", "api-controller.createFolder", "oss.upload"),
        apiRoute("GET", "/sync/status/:fileId", "api-controller.getSyncStatus", "oss.read"),
        apiRoute("DELETE", "/media/:fileId", "api-controller.deleteMedia", "oss.delete"),
    ],
});
