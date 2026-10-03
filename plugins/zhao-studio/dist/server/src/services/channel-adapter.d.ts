import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publish(article: any, account: any): Promise<{
        success: boolean;
        createdDraft: boolean;
        draftId: any;
        error: string;
        externalId?: undefined;
        url?: undefined;
        publishId?: undefined;
        finalPollStatus?: undefined;
    } | {
        success: boolean;
        externalId: any;
        url: any;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        error?: undefined;
        finalPollStatus?: undefined;
    } | {
        success: boolean;
        error: string;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        externalId?: undefined;
        url?: undefined;
        finalPollStatus?: undefined;
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
        url?: undefined;
        publishId?: undefined;
        finalPollStatus?: undefined;
    } | {
        success: boolean;
        externalId: any;
        url: any;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        error?: undefined;
        finalPollStatus?: undefined;
    } | {
        success: boolean;
        error: string;
        publishId: any;
        createdDraft?: undefined;
        draftId?: undefined;
        externalId?: undefined;
        url?: undefined;
        finalPollStatus?: undefined;
    } | {
        success: boolean;
        externalId: any;
        error: string;
        publishId: any;
        finalPollStatus: any;
        createdDraft?: undefined;
        draftId?: undefined;
        url?: undefined;
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