"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    type: "content-api",
    routes: [
        {
            method: "GET",
            path: "/v1/my/tenants",
            handler: "tenant.getMyTenants",
            config: {
                auth: false,
                policies: [
                    "plugin::zhao-auth.is-authenticated",
                    "plugin::zhao-auth.tenant-context-injector",
                ],
            },
        },
    ],
});
