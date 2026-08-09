import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generate(siteId: number, requestHost: string): Promise<any>;
    _buildHreflang(seoConfig: any, siteUrl: string): Array<{
        hreflang: string;
        href: string;
    }>;
    getAiCrawlerList(): string[];
};
export default _default;
