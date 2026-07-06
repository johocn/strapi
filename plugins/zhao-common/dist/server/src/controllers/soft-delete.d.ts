import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    softDelete(ctx: any): Promise<void>;
    restore(ctx: any): Promise<void>;
    findDeleted(ctx: any): Promise<void>;
};
export default _default;
