import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getConfig(ctx: any): Promise<void>;
    updateConfig(ctx: any): Promise<void>;
    testProvider(ctx: any): Promise<void>;
};
export default _default;
