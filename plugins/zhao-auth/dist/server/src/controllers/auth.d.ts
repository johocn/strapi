import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    register(ctx: any): Promise<void>;
    resetPassword(ctx: any): Promise<void>;
    adminLocal(ctx: any): Promise<void>;
    login(ctx: any): Promise<void>;
    config(ctx: any): Promise<void>;
    checkThirdPartyEnabled(): Promise<boolean>;
    switchTenant(ctx: any): Promise<void>;
};
export default _default;
