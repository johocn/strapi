import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    get(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    applyToSite(ctx: any): Promise<void>;
};
export default _default;
