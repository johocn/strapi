import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    ensureDefault(siteId: number): Promise<any>;
    find(siteId: number): Promise<any>;
    update(siteId: number, data: any): Promise<any>;
    findPublic(siteId: number): Promise<any>;
};
export default _default;
