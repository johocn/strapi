import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    _scopeSvc(): Core.Service;
    _channelFilter(ctx: any, field: string): Record<string, any> | null;
    _assertInScope(ctx: any, record: any, field: string): void;
    find(ctx: any): Promise<void>;
    findOne(ctx: any): Promise<void>;
    create(ctx: any): Promise<void>;
    update(ctx: any): Promise<void>;
    delete(ctx: any): Promise<void>;
    useInvite(ctx: any): Promise<void>;
    getMyChain(ctx: any): Promise<void>;
    getMyDownstream(ctx: any): Promise<void>;
    getMyStats(ctx: any): Promise<void>;
    /**
     * SSO 远程同步分销关系（供 RemoteChannelSync 调用）
     * 请求体：{ userId, inviteCode?, channelCode? }
     */
    syncInvite(ctx: any): Promise<void>;
};
export default _default;
