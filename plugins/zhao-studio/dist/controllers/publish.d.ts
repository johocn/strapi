import type { Core } from '@strapi/strapi';
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
    publishVideo(ctx: any): Promise<void>;
    publishGallery(ctx: any): Promise<void>;
    publishContent(ctx: any): Promise<any>;
    listRecords(ctx: any): Promise<void>;
    getRecordDetail(ctx: any): Promise<any>;
    retryPublish(ctx: any): Promise<void>;
    syncStatus(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    findOnePlatform(ctx: any): Promise<void>;
    findOneAccount(ctx: any): Promise<void>;
    createSchedule(ctx: any): Promise<void>;
    listSchedules(ctx: any): Promise<void>;
    findOneSchedule(ctx: any): Promise<any>;
    cancelSchedule(ctx: any): Promise<void>;
    getDouyinSchema(ctx: any): Promise<any>;
    previewPublish(ctx: any): Promise<any>;
};
export default _default;
//# sourceMappingURL=publish.d.ts.map