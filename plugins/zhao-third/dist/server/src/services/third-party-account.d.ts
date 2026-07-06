import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    findByOpenId(platform: string, appType: string, openId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findByUnionId(platform: string, unionId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findByUser(userId: number | string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createAccount(data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateAccount(documentId: string, data: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    findAccounts(filters: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
};
export default _default;
//# sourceMappingURL=third-party-account.d.ts.map