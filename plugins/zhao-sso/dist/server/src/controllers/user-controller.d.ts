import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    me(ctx: any): Promise<void>;
    bind(ctx: any): Promise<void>;
    unbind(ctx: any): Promise<void>;
    changePassword(ctx: any): Promise<void>;
};
export default _default;
