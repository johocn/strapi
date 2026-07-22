import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    clicks(ctx: any): Promise<void>;
    orders(ctx: any): Promise<void>;
    sourceTags(ctx: any): Promise<void>;
};
export default _default;
