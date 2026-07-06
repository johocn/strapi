import { Core } from '@strapi/strapi';
export interface ChannelSyncResult {
    success: boolean;
    message?: string;
}
export interface IChannelSyncService {
    syncUserInvite(ssoUserId: number, inviteCode?: string, channelCode?: string): Promise<ChannelSyncResult>;
}
/**
 * LocalChannelSync: 同进程直接调用 zhao-channel 服务
 */
export declare const createLocalChannelSync: ({ strapi }: {
    strapi: Core.Strapi;
}) => IChannelSyncService;
/**
 * RemoteChannelSync: 通过 HTTP API 调用远程 zhao-channel
 * 使用 app_code + app_secret 签名认证，最多重试 3 次（指数退避）
 */
export declare const createRemoteChannelSync: ({ strapi, config, }: {
    strapi: Core.Strapi;
    config: {
        remoteUrl?: string;
        appCode?: string;
        appSecret?: string;
    };
}) => IChannelSyncService;
/**
 * Strapi 服务注册适配（默认导出）
 * 暴露 getSync() 方法供 sso-auth 使用
 */
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getSync(): IChannelSyncService | null;
};
export default _default;
