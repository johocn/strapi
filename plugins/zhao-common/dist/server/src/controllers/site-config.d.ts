import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    get(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    getPublic(ctx: any): Promise<void>;
};
export default _default;
