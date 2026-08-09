import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    generateRSS(siteId: number, siteUrl: string): Promise<string>;
    generateAtom(siteId: number, siteUrl: string): Promise<string>;
};
export default _default;
