import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    get(): Promise<{
        config: {};
        packages: any[];
        addons: any[];
        faqs: any[];
        reviews: any[];
        gallery: any[];
    }>;
};
export default _default;
