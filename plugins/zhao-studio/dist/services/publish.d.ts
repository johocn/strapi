import type { Core } from '@strapi/strapi';
import { type ContentType } from '../utils/publish-helpers';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publishContent({ type, contentId, accountIds, scheduledAt }: {
        type: ContentType;
        contentId: string;
        accountIds: string[];
        scheduledAt?: Date;
    }): Promise<any[]>;
    publishArticle(articleId: string, accountIds: string[], opts?: {
        scheduledAt?: Date;
    }): Promise<any[]>;
    listPlatforms(query?: any): Promise<{
        records: import("@strapi/types/dist/modules/documents").AnyDocument[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    createPlatform(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    updatePlatform(platformId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deletePlatform(platformId: string): Promise<void>;
    listAccounts(query?: any): Promise<{
        records: import("@strapi/types/dist/modules/documents").AnyDocument[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    createAccount(data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument>;
    updateAccount(accountId: string, data: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    deleteAccount(accountId: string): Promise<void>;
    listRecords(query?: any): Promise<{
        records: import("@strapi/types/dist/modules/documents").AnyDocument[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    getRecordDetail(recordId: string): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
    retryPublish(recordId: string): Promise<any>;
    createSchedule(data: {
        articleId?: string;
        videoId?: string;
        galleryId?: string;
        accountIds: string[];
        scheduledAt: string;
        name?: string;
    }): Promise<any[]>;
    listSchedules(query?: any): Promise<{
        list: import("@strapi/types/dist/modules/documents").AnyDocument[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    findOneSchedule(id: string, populate?: any): Promise<import("@strapi/types/dist/modules/documents").AnyDocument | null>;
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