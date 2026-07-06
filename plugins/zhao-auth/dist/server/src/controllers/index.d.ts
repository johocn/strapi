declare const _default: {
    "role-management": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findUsers(ctx: any): Promise<void>;
        assignRole(ctx: any): Promise<void>;
        revokeRole(ctx: any): Promise<void>;
        getUserRoles(ctx: any): Promise<void>;
        batchAssignRoles(ctx: any): Promise<void>;
        getActionLogs(ctx: any): Promise<void>;
        getMyRoles(ctx: any): Promise<void>;
        getMyPermissions(ctx: any): Promise<void>;
    };
    auth: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        register(ctx: any): Promise<void>;
        resetPassword(ctx: any): Promise<void>;
        adminLocal(ctx: any): Promise<void>;
        login(ctx: any): Promise<void>;
        config(ctx: any): Promise<void>;
        checkThirdPartyEnabled(): Promise<boolean>;
    };
    permission: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getTree(ctx: any): Promise<void>;
        listRoles(ctx: any): Promise<void>;
        getAllRoles(ctx: any): Promise<void>;
        getRole(ctx: any): Promise<void>;
        createRole(ctx: any): Promise<void>;
        updateRole(ctx: any): Promise<void>;
        deleteRole(ctx: any): Promise<void>;
        getRolePermissions(ctx: any): Promise<void>;
        updateRolePermissions(ctx: any): Promise<void>;
        initRoles(ctx: any): Promise<void>;
        getMyPermissions(ctx: any): Promise<void>;
        getMyChannelScope(ctx: any): Promise<void>;
    };
    "role-channel": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        list(ctx: any): Promise<void>;
        grant(ctx: any): Promise<void>;
        batchGrant(ctx: any): Promise<void>;
        revoke(ctx: any): Promise<void>;
        revokeByRole(ctx: any): Promise<void>;
    };
    tenant: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getMyTenants(ctx: any): Promise<void>;
    };
};
export default _default;
