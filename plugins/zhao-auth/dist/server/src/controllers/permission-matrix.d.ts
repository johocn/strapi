import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getMatrix(ctx: any): Promise<void>;
    updateRolePermissions(ctx: any): Promise<any>;
    resetRolePermissions(ctx: any): Promise<any>;
    getActions(ctx: any): Promise<void>;
};
export default _default;
