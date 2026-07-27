import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    list(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
};
export default _default;
