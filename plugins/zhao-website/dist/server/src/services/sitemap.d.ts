import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generate(siteId: number, siteUrl: string): Promise<string>;
    _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string): string;
};
export default _default;
