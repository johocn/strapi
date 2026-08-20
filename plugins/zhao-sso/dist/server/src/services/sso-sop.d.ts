import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 身份桥接：按标识(mobile 优先/username/email)把业务用户(up_users)解析为 sso-user。
     * 匹配不到(未做微信绑定/标识不一)返回 null，调用方跳过触达并记日志。
     */
    resolveSsoUserForUpUser(upUserId: number): Promise<any>;
    /** 事件触发：业务埋点统一入口。
     * - 有 schedules：按业务精确排期逐条建任务（覆盖规则默认延迟）。
     * - 无 schedules：按匹配事件且启用的规则生成任务（delayMinutes 相对延迟）。
     */
    trigger(event: string, opts: {
        user: number;
        payload?: Record<string, any>;
        schedules?: Array<{
            templateCode: string;
            scene?: string;
            scheduledAt?: string;
            delayMinutes?: number;
            params?: Record<string, any>;
            link?: string;
            dedupeKey?: string;
        }>;
    }): Promise<any[]>;
    /** cron 调度：扫描到期 pending 任务并发送，返回已发送条数 */
    runDueJobs(limit?: number): Promise<number>;
};
export default _default;
