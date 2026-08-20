import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    listTemplates(ctx: any): Promise<void>;
    getTemplate(ctx: any): Promise<void>;
    createTemplate(ctx: any): Promise<void>;
    updateTemplate(ctx: any): Promise<void>;
    deleteTemplate(ctx: any): Promise<void>;
    listJobs(ctx: any): Promise<void>;
    getJob(ctx: any): Promise<void>;
    /** 手动单发：立即 buildJob + sendJob */
    sendNow(ctx: any): Promise<void>;
    /** 批量发送：按用户 id 列表 or 筛选，逐个 buildJob+sendJob */
    sendBatch(ctx: any): Promise<void>;
    /** 失败重试 */
    retryJob(ctx: any): Promise<void>;
    /** 查询/刷新用户公众号关注状态 */
    refreshSubscribe(ctx: any): Promise<void>;
};
export default _default;
