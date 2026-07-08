import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    buildOrganization(brandInfo: any, seoConfig: any): any;
    buildArticle(article: any, brandInfo: any): any;
    buildProduct(product: any, brandInfo: any): any;
    buildHowTo(tutorial: any): any;
    buildFAQ(faqs: any[]): any;
    buildBreadcrumb(items: Array<{
        name: string;
        url: string;
    }>): any;
    buildWebSite(seoConfig: any, siteUrl: string): any;
};
export default _default;
