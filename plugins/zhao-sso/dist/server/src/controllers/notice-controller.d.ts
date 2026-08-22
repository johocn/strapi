import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 我的站内信：读 provider=inapp && status=sent 的消息（按 sso-user 归属）
     * ?page&pageSize&unreadOnly  => { data: { list, unreadCount }, meta }
     */
    myNotices(ctx: any): Promise<void>;
    /** 标记站内信已读（幂等，仅属主可操作） */
    read(ctx: any): Promise<void>;
};
export default _default;
