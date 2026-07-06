import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publishArticle(articleId: string, accountIds: string[]): Promise<any[]>;
    listPlatforms(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createPlatform(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updatePlatform(platformId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deletePlatform(platformId: string): Promise<void>;
    listAccounts(platformId?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    createAccount(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    updateAccount(accountId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument | null>;
    deleteAccount(accountId: string): Promise<void>;
    listRecords(filters?: {
        articleId?: string;
        platformId?: string;
        accountId?: string;
    }): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    retryPublish(recordId: string): Promise<any>;
};
export default _default;
//# sourceMappingURL=publish.d.ts.map