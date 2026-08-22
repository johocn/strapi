import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 构建消息任务(pending)。幂等：同 dedupeKey 已有未终态任务则跳过。
     * @param opts { user, scene, templateCode, params, link, scheduledAt?, dedupeKey? }
     */
    buildJob(opts: {
        user: number;
        scene: string;
        templateCode: string;
        params?: Record<string, any>;
        link?: string;
        scheduledAt?: string;
        dedupeKey?: string;
    }): Promise<{
        job: any;
        skipped: boolean;
    }>;
    /**
     * 站内信：直接落一条 provider=inapp、status=sent、sentAt=now 的 msg-job，
     * 即时可见、幂等（同 dedupeKey 已存在且非 failed/cancelled 则跳过），不经过 cron 待发队列。
     * @param opts { user, scene, params, link?, dedupeKey? }
     */
    sendInApp(opts: {
        user: number;
        scene: string;
        params?: Record<string, any>;
        link?: string;
        dedupeKey?: string;
    }): Promise<{
        job: any;
        skipped: boolean;
    }>;
    /**
     * 立即构建并发送（手动/单发）——同步执行，返回发送结果。
     */
    sendNow(opts: {
        user: number;
        scene: string;
        templateCode: string;
        params?: Record<string, any>;
        link?: string;
        dedupeKey?: string;
    }): Promise<any>;
    /**
     * 发送指定 job（含重试上限），落库回执。
     */
    sendJob(jobId: number): Promise<any>;
    getJob(jobId: number): Promise<any>;
    /** 拉取待发送任务（供 cron 进程调度）。dueOnly=true 时只取已到发送时间的任务 */
    listPendingJobsForSend(limit?: number, dueOnly?: boolean): Promise<any[]>;
    /** 查询/刷新用户公众号关注状态，落库到 sso-third-party-binding.subscribe */
    refreshSubscribe(userId: number, appType?: string): Promise<any>;
};
export default _default;
