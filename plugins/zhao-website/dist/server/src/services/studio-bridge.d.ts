import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publishFromStudio(siteId: number, params: {
        articleDraftDocumentId: string;
        overrides?: any;
    }): Promise<any>;
};
export default _default;
