import { Core } from '@strapi/strapi';
export interface UrlResolver {
    resolveUrl(file: {
        id: number;
        url: string;
    }): Promise<string>;
    resolveUrls(files: Array<{
        id: number;
        url: string;
    }>): Promise<Map<number, string>>;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => UrlResolver;
export default _default;
