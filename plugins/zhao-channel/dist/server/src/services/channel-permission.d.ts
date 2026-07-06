import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    grantChannelsToUser(userId: number, channelIds: number[], grantedBy: number): Promise<{
        granted: number;
        channelIds: number[];
    }>;
    grantChannelsToRole(roleName: string, channelIds: number[], grantedBy: number): Promise<{
        granted: number;
        channelIds: number[];
    }>;
    batchGrantAsync(type: "user" | "role", targetId: number | string, channelIds: number[], grantedBy: number): Promise<{
        jobId: any;
        status: string;
        type: "user" | "role";
        targetId: string | number;
        channelCount: number;
    }>;
    revokeChannelsFromUser(userId: number, channelIds: number[]): Promise<{
        revoked: number;
        channelIds: number[];
    }>;
    revokeChannelsFromRole(roleName: string, channelIds: number[]): Promise<{
        revoked: number;
        channelIds: number[];
    }>;
    getUserChannels(userId: number): Promise<{
        id: any;
        name: any;
    }[]>;
    getRoleChannels(roleName: string): Promise<{
        id: any;
        name: any;
    }[]>;
    getBatchGrantStatus(jobId: string): Promise<{
        jobId: string;
        status: string;
        type?: undefined;
        targetId?: undefined;
        channelCount?: undefined;
        finishedPercent?: undefined;
    } | {
        jobId: import('bull').JobId;
        status: import('bull').JobStatus | "stuck";
        type: any;
        targetId: any;
        channelCount: any;
        finishedPercent: number;
    }>;
    getUserAllChannels(userId: number): Promise<number[]>;
    /**
     * 获取用户直接关联的渠道（不扩展子树）
     * 与 getUserAllChannels 的差异：不调用 getDescendantIdsByPath，仅返回三源直接关联的渠道 id
     * 适用场景：/channels/available 等仅需直接渠道的端点
     * 不走 Redis 缓存，直接查 DB
     */
    getUserDirectChannels(userId: number): Promise<number[]>;
    /**
     * 角色等级映射
     */
    ROLE_LEVELS: Record<string, number>;
    /**
     * 检查用户是否有渠道访问权限
     */
    checkUserChannelPermission(userId: number, channelId: number): Promise<boolean>;
    /**
     * 获取用户在指定渠道的 channel-member 角色及等级值
     */
    getChannelMemberRole(userId: number, channelId: number): Promise<{
        role: string;
        level: number;
        isCurrent: boolean;
    }>;
    /**
     * 检查用户角色是否达到指定等级
     */
    checkChannelMemberRole(userId: number, channelId: number, minLevel: number): Promise<boolean>;
};
export default _default;
