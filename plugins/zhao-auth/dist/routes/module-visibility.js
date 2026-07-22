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
            "plugin::zhao-auth.tenant-context-injector",
            { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
        ],
    },
});
exports.default = () => ({
    type: "content-api",
    routes: [
        adminRoute("GET", "/module-visibility", "module-visibility.get", "menu.module-visibility"),
        adminRoute("PUT", "/module-visibility", "module-visibility.update", "menu.module-visibility"),
    ],
});
