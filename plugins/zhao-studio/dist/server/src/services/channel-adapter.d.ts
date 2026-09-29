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
        draftId: any;
        wxArticleId: any;
        createdDraft: boolean;
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
    /**
     * 公众号：委托 zhao-sso 已实现的微信图文协议（draft/add）建草稿，本插件不重复实现微信协议。
     * 只建草稿、不自动发布；freepublish/submit 需人工确认草稿后由 zhao-sso 执行。
     */
    publishToWechat(article: any, account: any): Promise<{
        success: boolean;
        externalId: any;
        draftId: any;
        wxArticleId: any;
        createdDraft: boolean;
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