import type { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publishArticle(articleId: string, accountIds: string[], opts?: {
        scheduledAt?: Date;
    }): Promise<any[]>;
    listPlatforms(): Promise<import("@strapi/types/dist/modules/documents").AnyDocument[]>;
    createPlatform(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    updatePlatform(platformId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deletePlatform(platformId: string): Promise<void>;
    listAccounts(platformId?: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument[]>;
    createAccount(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    updateAccount(accountId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deleteAccount(accountId: string): Promise<void>;
    listRecords(filters?: {
        articleId?: string;
        platformId?: string;
        accountId?: string;
    }): Promise<import("@strapi/types/dist/modules/documents").AnyDocument[]>;
    retryPublish(recordId: string): Promise<any>;
    createSchedule(data: {
        articleId: string;
        accountIds: string[];
        scheduledAt: string;
        name?: string;
    }): Promise<any[]>;
    listSchedules(filters?: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument[]>;
    findOneSchedule(id: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    cancelSchedule(id: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    getDouyinSchema(recordId: string): Promise<{
        recordId: string;
        schema: string;
    }>;
    previewPublish(articleId: string, accountIds: string[]): Promise<{
        articleId: string;
        articleTitle: any;
        results: ({
            accountId: any;
            accountName: any;
            platform: any;
            adaptedTitle: any;
            adaptedContentPreview: string;
            contentLength: number;
            error?: undefined;
        } | {
            accountId: any;
            accountName: any;
            platform: any;
            error: any;
            adaptedTitle?: undefined;
            adaptedContentPreview?: undefined;
            contentLength?: undefined;
        })[];
    }>;
};
export default _default;
//# sourceMappingURL=publish.d.ts.map