import { Core } from '../../../../../node_modules/@strapi/strapi';
type ContentType = 'article' | 'video' | 'gallery';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publish(content: any, account: any, contentType?: ContentType): Promise<any>;
    publishToToutiao(content: any, account: any, contentType: ContentType, _accessToken?: string): Promise<any>;
    publishToXiaohongshu(content: any, account: any, contentType: ContentType, _accessToken?: string): Promise<any>;
    publishToWechat(content: any, account: any, contentType: ContentType, _accessToken?: string): Promise<{
        success: boolean;
        createdDraft: boolean;
        draftId: any;
        error: string;
        contentType: "article";
        externalId?: undefined;
        publishId?: undefined;
    } | {
        success: boolean;
        externalId: any;
        publishId: any;
        contentType: "article";
        createdDraft?: undefined;
        draftId?: undefined;
        error?: undefined;
    }>;
    publishToInternal(content: any, account: any, contentType: ContentType): Promise<{
        success: boolean;
        externalId: any;
        accessUrl: string;
        channelCode: any;
        contentType: ContentType;
    }>;
    publishToCustom(content: any, account: any, contentType: ContentType, _accessToken?: string): Promise<{
        success: boolean;
        externalId: any;
        accessUrl: any;
        contentType: "video";
        custom: boolean;
        error?: undefined;
    } | {
        success: boolean;
        externalId: any;
        accessUrl: string;
        contentType: "gallery";
        custom: boolean;
        error?: undefined;
    } | {
        success: any;
        externalId: any;
        error: any;
        contentType: "article";
        accessUrl?: undefined;
        custom?: undefined;
    }>;
    generateDouyinShareSchema({ clientKey, ticket, videoPath, title, customCoverImageUrl, }: {
        clientKey: string;
        ticket: string;
        videoPath?: string;
        title: string;
        customCoverImageUrl?: string;
    }): string;
    getDouyinTicket(clientKey: string, clientSecret: string): Promise<string>;
    publishToDouyin(content: any, account: any, contentType: ContentType, _accessToken?: string): Promise<{
        success: boolean;
        publish_mode: string;
        schema: string;
        contentType: "article";
    }>;
    adaptContent(content: any, platformType: string): Promise<any>;
    checkExternalStatus(record: any): Promise<{
        deleted: boolean;
        status?: string;
    }>;
};
export default _default;
//# sourceMappingURL=channel-adapter.d.ts.map