import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    publish(article: any, account: any): Promise<{
        success: any;
        externalId: any;
        error: any;
    } | {
        success: boolean;
        externalId: any;
        accessUrl: string;
        channelCode: any;
    }>;
    publishToToutiao(article: any, account: any): Promise<{
        success: any;
        externalId: any;
        error: any;
    }>;
    publishToXiaohongshu(article: any, account: any): Promise<{
        success: any;
        externalId: any;
        error: any;
    }>;
    publishToWechat(article: any, account: any): Promise<{
        success: boolean;
        externalId: any;
        error: any;
    }>;
    publishToInternal(article: any, account: any): Promise<{
        success: boolean;
        externalId: any;
        accessUrl: string;
        channelCode: any;
    }>;
    publishToCustom(article: any, account: any): Promise<{
        success: any;
        externalId: any;
        error: any;
    }>;
    adaptContent(content: any, platformType: string): Promise<any>;
    checkExternalStatus(record: any): Promise<{
        deleted: boolean;
        status?: string;
    }>;
};
export default _default;
//# sourceMappingURL=channel-adapter.d.ts.map