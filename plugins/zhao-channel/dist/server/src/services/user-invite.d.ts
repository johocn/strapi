import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 生成未使用的邀请码（最多重试 5 次避免碰撞）
     */
    generateUniqueCode(): Promise<string>;
    /**
     * 为用户创建 user-invite 记录
     * @param userId 用户 ID
     * @param inviterCode 邀请码（可选，被邀请时传入）
     * @param inviteChannelId 邀请人所属渠道 ID（可选）
     * @param externalInviteCode 外部邀请码（可选，SSO 生成时直接使用，跳过本地生成）
     * @param channelCode 渠道编码（可选，优先于 inviteChannelId，自动解析为 channelId）
     */
    createForUser(userId: number, inviterCode?: string, inviteChannelId?: number, externalInviteCode?: string, channelCode?: string): Promise<any>;
    /**
     * 格式化邀请信息为 API 响应格式
     */
    formatInviteInfo(inviteInfo: any): {
        myInviteCode: any;
        invitedBy: {
            id: any;
        };
        inviteMethod: any;
        distributionDepth: any;
        boundChannel: {
            id: any;
            name: any;
        };
    };
    /**
     * 根据 inviteCode 查找用户
     */
    findByInviteCode(code: string): Promise<any>;
    /**
     * 根据用户 ID 查找 user-invite 记录
     */
    findByUserId(userId: number): Promise<any>;
    /**
     * 获取用户的分销链（从自身向上 3 级）
     * 返回 [root, ... , self] 按深度升序排列
     */
    getDistributionChain(userId: number): Promise<{
        id: number;
        username: any;
        email: any;
        depth: number;
    }[]>;
    /**
     * 查询用户的下级分销用户列表（直接下级）
     */
    getDirectDownstream(userId: number): Promise<{
        userId: any;
        username: any;
        email: any;
        inviteCode: any;
        inviteMethod: any;
        distributionDepth: any;
        boundChannel: {
            id: any;
            name: any;
        };
        createdAt: any;
    }[]>;
    /**
     * 查询用户的所有下级分销（递归，通过 distributionPath 前缀匹配）
     */
    getAllDownstream(userId: number): Promise<{
        userId: any;
        username: any;
        email: any;
        depth: any;
        boundChannel: {
            id: any;
            name: any;
        };
        createdAt: any;
    }[]>;
    /**
     * 获取用户的分销统计
     */
    getUserDistributionStats(userId: number): Promise<{
        userId: number;
        inviteCode: any;
        inviteMethod: any;
        distributionDepth: any;
        distributionChain: {
            id: number;
            username: any;
            email: any;
            depth: number;
        }[];
        boundChannel: {
            id: any;
            name: any;
        };
        stats: {
            directCount: number;
            totalDownstreamCount: number;
            maxDepth: number;
        };
    }>;
    /**
     * 简单 CRUD 方法（管理端用）
     */
    find(query?: any): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<any>;
    create(data: any): Promise<any>;
    update(id: number, data: any): Promise<any>;
    delete(id: number): Promise<any>;
    /**
     * 使用邀请码（C 端入口）
     * 1. 校验邀请码有效性
     * 2. 创建渠道成员（非当前渠道）
     * 3. 授权关联渠道
     * 4. 更新邀请状态为 used
     */
    useInvite(code: string, usedByUserId: number): Promise<any>;
    /**
     * 获取渠道维度的分销统计（用于替换 channel.getDistributionStats）
     */
    getChannelDistributionStats(channelId: number): Promise<{
        channelId: number;
        directCustomerCount: number;
        subChannelCustomerCount: number;
        totalCustomerCount: number;
    }>;
};
export default _default;
