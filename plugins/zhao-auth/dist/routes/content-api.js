"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const publicRoute = (method, path, handler) => ({
    method,
    path: `/v1${path}`,
    handler,
    config: { auth: false },
});
const userRoute = (method, path, handler) => ({
    method,
    path: `/v1${path}`,
    handler,
    config: {
        auth: false,
        policies: [
            "plugin::zhao-auth.is-authenticated",
            "plugin::zhao-auth.tenant-context-injector",
        ],
    },
});
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
        publicRoute("GET", "/auth/config", "auth.config"),
        publicRoute("POST", "/login", "auth.login"),
        publicRoute("POST", "/admin/auth/local", "auth.adminLocal"),
        publicRoute("POST", "/register", "auth.register"),
        publicRoute("POST", "/reset-password", "auth.resetPassword"),
        userRoute("POST", "/auth/switch-tenant", "auth.switchTenant"),
        userRoute("GET", "/my/roles", "role-management.getMyRoles"),
        userRoute("GET", "/my/permissions", "role-management.getMyPermissions"),
        userRoute("GET", "/my/permission-keys", "permission.getMyPermissions"),
        // 角色管理
        adminRoute("GET", "/roles", "permission.listRoles", "role.read"),
        adminRoute("GET", "/roles/all", "permission.getAllRoles", "role.read"),
        adminRoute("GET", "/roles/:role", "permission.getRole", "role.read"),
        adminRoute("POST", "/roles", "permission.createRole", "role.create"),
        adminRoute("PUT", "/roles/:role", "permission.updateRole", "role.assign"),
        adminRoute("DELETE", "/roles/:role", "permission.deleteRole", "role.assign"),
        adminRoute("GET", "/users", "role-management.findUsers", "role.read"),
        adminRoute("GET", "/users/:id/roles", "role-management.getUserRoles", "role.read"),
        adminRoute("POST", "/roles/assign", "role-management.assignRole", "role.assign"),
        adminRoute("POST", "/roles/revoke", "role-management.revokeRole", "role.revoke"),
        adminRoute("POST", "/roles/batch-assign", "role-management.batchAssignRoles", "role.assign"),
        adminRoute("GET", "/roles/logs", "role-management.getActionLogs", "role.read-logs"),
        adminRoute("GET", "/users/:id/detail", "role-management.getUserDetail", "role.read"),
        adminRoute("GET", "/assignable-roles", "role-management.getAssignableRoles", "role.read"),
        // 权限管理
        adminRoute("GET", "/permissions/tree", "permission.getTree", "role.read"),
        adminRoute("GET", "/permissions/role/:role", "permission.getRolePermissions", "role.read"),
        adminRoute("PUT", "/permissions/role/:role", "permission.updateRolePermissions", "role.assign"),
        adminRoute("POST", "/permissions/init", "permission.initRoles", "role.assign"),
        // 渠道范围查询
        userRoute("GET", "/my/channel-scope", "permission.getMyChannelScope"),
        // 角色-渠道授权
        adminRoute("GET", "/role-channels", "role-channel.list", "role.assign"),
        adminRoute("POST", "/role-channels", "role-channel.grant", "role.assign"),
        adminRoute("POST", "/role-channels/batch", "role-channel.batchGrant", "role.assign"),
        adminRoute("DELETE", "/role-channels/:id", "role-channel.revoke", "role.assign"),
        adminRoute("DELETE", "/role-channels/role/:role", "role-channel.revokeByRole", "role.assign"),
    ],
});
