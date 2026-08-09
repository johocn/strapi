import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generate(siteId: number, siteUrl: string): Promise<string>;
    _urlEntry(siteUrl: string, path: string, priority: string, changefreq: string, lastmod?: string, imageUrl?: string, hreflangEntries?: Array<{
        hreflang: string;
        href: string;
    }>): string;
    _buildHreflangEntries(seoConfig: any, siteUrl: string): Array<{
        hreflang: string;
        href: string;
    }>;
    _buildItemHreflang(seoConfig: any, siteUrl: string, path: string): Array<{
        hreflang: string;
        href: string;
    }>;
};
export default _default;
