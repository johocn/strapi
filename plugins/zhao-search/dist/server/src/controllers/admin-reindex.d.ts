import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    reindex(ctx: any): Promise<void>;
    health(ctx: any): Promise<void>;
};
export default _default;
