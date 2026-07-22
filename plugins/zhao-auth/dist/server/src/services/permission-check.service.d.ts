import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    checkPermission(userId: number, action: string, tenantDocumentId?: string): Promise<{
        allowed: boolean;
        reasons: string[];
    }>;
};
export default _default;
