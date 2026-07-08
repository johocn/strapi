import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    pushToBaidu(siteId: number, urls: string[]): Promise<any>;
    pushToBing(siteId: number, urls: string[]): Promise<any>;
    pushAll(siteId: number, urls: string[]): Promise<{
        baidu: PromiseSettledResult<any>;
        bing: PromiseSettledResult<any>;
    }>;
};
export default _default;
