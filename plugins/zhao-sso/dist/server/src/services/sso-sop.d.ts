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
    /** 管理员接收手动 SOP 待办提醒的 sso-user 列表（来自插件配置，未配则跳过推送，保留后台待办列表）。 */
    adminNotifyUsers(): number[];
    /**
     * 事件埋点：为「手动 SOP」环节生成一条待办 + 微信提醒管理员。
     * 不在此刻发送任何 C 端消息；真正的发送在 dispatchManualTodo（管理员点发）时发生。
     */
    enqueueManualSop(entry: {
        code: string;
        title: string;
        scene: string;
        templateCode?: string;
        link?: string;
        audience: Record<string, any>;
        paramsTemplate?: Record<string, any>;
        description?: string;
    }): Promise<{
        todo: any;
        notified: number;
    }>;
    /** 微信模板推送给管理员（sso-user），未配置名单则跳过（仅留后台待办列表）。 */
    notifyAdmins({ todoId, scene, title }: {
        todoId: number;
        scene: string;
        title: string;
    }): Promise<number>;
    /**
     * 管理员点发：按待办 audience 实时查目标 up_user 名单，逐条建 job。
     * audience 形态由调用方(zhao-point)按需约定；此处以通用「query object」委托给回调解释。
     */
    dispatchManualTodo(todoId: number, resolveTargetUsers: (audience: any) => Promise<number[]>): Promise<{
        sent: number;
        skipped: number;
        reason: string;
    } | {
        sent: number;
        skipped: number;
        reason?: undefined;
    }>;
};
export default _default;
