import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    checkPermission(ctx: any): Promise<void>;
    getUserChannels(ctx: any): Promise<void>;
    batchGrant(ctx: any): Promise<void>;
};
export default _default;
