import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    detail(ctx: any): Promise<void>;
    recalcAll(ctx: any): Promise<void>;
};
export default _default;
