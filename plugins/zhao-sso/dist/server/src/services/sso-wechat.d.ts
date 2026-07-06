import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getAuthorizeUrl(state: string): Promise<string>;
    handleCallback(code: string): Promise<{
        userId: any;
        isNew: boolean;
    }>;
};
export default _default;
