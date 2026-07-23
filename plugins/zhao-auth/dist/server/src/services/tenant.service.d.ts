import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getMyTenants(userId: number, roles: string[]): Promise<{
        id: any;
        documentId: any;
        siteName: any;
        domain: any;
        featureFlags: any;
        channelsCount: any;
        templateName: any;
        updatedAt: any;
    }[]>;
};
export default _default;
