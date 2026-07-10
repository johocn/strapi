import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listPlatforms(ctx: any): Promise<void>;
    createPlatform(ctx: any): Promise<void>;
    updatePlatform(ctx: any): Promise<void>;
    deletePlatform(ctx: any): Promise<void>;
    listAccounts(ctx: any): Promise<void>;
    createAccount(ctx: any): Promise<void>;
    updateAccount(ctx: any): Promise<void>;
    deleteAccount(ctx: any): Promise<void>;
    publishArticle(ctx: any): Promise<void>;
    listRecords(ctx: any): Promise<void>;
    retryPublish(ctx: any): Promise<void>;
    syncStatus(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    findOnePlatform(ctx: any): Promise<void>;
    findOneAccount(ctx: any): Promise<void>;
};
export default _default;
//# sourceMappingURL=publish.d.ts.map