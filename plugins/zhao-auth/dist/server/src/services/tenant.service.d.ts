import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getMyTenants(userId: number, roles: string[]): Promise<{
        id: any;
        documentId: any;
        name: any;
        domain: any;
    }[]>;
};
export default _default;
