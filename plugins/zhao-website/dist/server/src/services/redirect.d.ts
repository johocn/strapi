import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    match(siteId: number, requestPath: string): Promise<{
        toUrl: string;
        statusCode: number;
    } | null>;
};
export default _default;
