import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
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
export default _default;
