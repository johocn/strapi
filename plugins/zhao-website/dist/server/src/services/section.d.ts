import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    find(siteId: number, query?: any): Promise<any[]>;
    findOne(siteId: number, slug: string, locale?: string): Promise<any>;
};
export default _default;
