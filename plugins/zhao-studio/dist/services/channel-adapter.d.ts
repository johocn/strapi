import type { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publish(article: any, account: any): Promise<{
        success: boolean;
        createdDraft: boolean;
        draftId: any;
        error: string;
        externalId?: undefined;
        publishId?: undefined;
    } | {
        success: boolean;
        externalId: any;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        publish_mode: string;
        schema: string;
    } | {
        success: boolean;
        externalId: any;
        accessUrl: string;
        channelCode: any;
    } | {
        success: any;
        externalId: any;
        error: any;
    }>;
    publishToToutiao(article: any, account: any, _accessToken?: string): Promise<never>;
    publishToXiaohongshu(article: any, account: any, _accessToken?: string): Promise<never>;
    publishToWechat(article: any, account: any, _accessToken?: string): Promise<{
        success: boolean;
        createdDraft: boolean;
        draftId: any;
        error: string;
        externalId?: undefined;
        publishId?: undefined;
    } | {
        success: boolean;
        externalId: any;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        error?: undefined;
    }>;
    publishToInternal(article: any, account: any): Promise<{
        success: boolean;
        externalId: any;
        accessUrl: string;
        channelCode: any;
    }>;
    publishToCustom(article: any, account: any, _accessToken?: string): Promise<{
        success: any;
        externalId: any;
        error: any;
    }>;
    generateDouyinShareSchema({ clientKey, ticket, videoPath, title, customCoverImageUrl, }: {
        clientKey: string;
        ticket: string;
        videoPath?: string;
        title: string;
        customCoverImageUrl?: string;
    }): string;
    getDouyinTicket(clientKey: string, clientSecret: string): Promise<string>;
    publishToDouyin(article: any, account: any, _accessToken?: string): Promise<{
        success: boolean;
        publish_mode: string;
        schema: string;
    }>;
    adaptContent(content: any, platformType: string): Promise<any>;
    checkExternalStatus(record: any): Promise<{
        deleted: boolean;
        status?: string;
    }>;
};
export default _default;
//# sourceMappingURL=channel-adapter.d.ts.map