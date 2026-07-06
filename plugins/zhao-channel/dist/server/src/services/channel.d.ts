import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 查询渠道列表
     */
    find(query?: any): Promise<{
        list: {
            id: any;
            documentId: any;
            attributes: {
                name: any;
                code: any;
                description: any;
                channelTier: any;
                status: any;
                path: any;
                depth: any;
                parentChannelId: {
                    id: any;
                    name: any;
                };
                createdAt: any;
                updatedAt: any;
            };
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /**
     * 查询单个渠道
     */
    findOne(id: number): Promise<{
        id: any;
        documentId: any;
        attributes: {
            name: any;
            code: any;
            description: any;
            channelTier: any;
            status: any;
            path: any;
            depth: any;
            parentChannelId: {
                id: any;
                name: any;
            };
            createdAt: any;
            updatedAt: any;
        };
    }>;
    /**
     * 创建渠道（在已有父渠道下创建）
     */
    create(data: any): Promise<{
        id: any;
        documentId: any;
        attributes: {
            name: any;
            code: any;
            description: any;
            channelTier: any;
            status: any;
            path: any;
            depth: any;
            parentChannelId: {
                id: any;
                name: any;
            };
            createdAt: any;
            updatedAt: any;
        };
    }>;
    /**
     * 更新渠道
     * 如果 parentChannel 变更，需要递归更新所有子孙的 path
     */
    update(id: number, data: any): Promise<{
        id: any;
        documentId: any;
        attributes: {
            name: any;
            code: any;
            description: any;
            channelTier: any;
            status: any;
            path: any;
            depth: any;
            parentChannelId: {
                id: any;
                name: any;
            };
            createdAt: any;
            updatedAt: any;
        };
    }>;
    /**
     * 删除渠道（级联删除，使用事务保证一致性）
     * 1. 检查渠道是否存在
     * 2. 通过 path 查询所有子孙渠道
     * 3. 收集受影响的用户 ID
     * 4. 在单个事务内：删除关联 + 从叶子到根删除 channels
     * 5. 清理 Redis 缓存
     */
    delete(id: number): Promise<{
        affectedUsers: number;
        deletedChannels: number;
        deletedMembers: number;
        deletedUserChannels: number;
        deletedRoleChannels: number;
    }>;
    /**
     * 创建根渠道（root 级别）
     */
    createRoot(data: {
        name: string;
        description?: string;
    }): Promise<{
        id: any;
        name: any;
        code: any;
        description: any;
        channelTier: any;
        path: any;
        depth: any;
    }>;
    /**
     * 通过邀请码注册子渠道，并创建登录用户
     */
    register(data: {
        code: string;
        name: string;
        description?: string;
        channelTier?: string;
        email?: string;
        username?: string;
        password?: string;
    }): Promise<{
        user?: {
            id: any;
            email: any;
            username: any;
        };
        id: any;
        name: any;
        code: any;
        description: any;
        channelTier: any;
        path: any;
        depth: any;
        parentChannelId: any;
    }>;
    /**
     * 获取渠道网络（父+直接子渠道）
     */
    getNetwork(id: number): Promise<{
        channel: {
            id: any;
            documentId: any;
            attributes: {
                name: any;
                code: any;
                description: any;
                channelTier: any;
                status: any;
                path: any;
                depth: any;
                parentChannelId: {
                    id: any;
                    name: any;
                };
                createdAt: any;
                updatedAt: any;
            };
        };
        children: {
            id: any;
            documentId: any;
            attributes: {
                name: any;
                code: any;
                description: any;
                channelTier: any;
                status: any;
                path: any;
                depth: any;
                parentChannelId: {
                    id: any;
                    name: any;
                };
                createdAt: any;
                updatedAt: any;
            };
        }[];
    }>;
    /**
     * 验证邀请码
     */
    validateCode(code: string): Promise<{
        ok: boolean;
        valid: boolean;
        channel?: undefined;
    } | {
        ok: boolean;
        valid: boolean;
        channel: {
            id: any;
            name: any;
            code: any;
            channelTier: any;
            path: any;
            depth: any;
        };
    }>;
    /**
     * 获取完整层级树（使用 path 前缀一次性查询后再组装）
     */
    getHierarchy(id: number): Promise<{
        hierarchy: any;
    }>;
    /**
     * 获取渠道统计（使用 path 前缀计算子渠道数量）
     */
    getStats(id: number): Promise<{
        stats: {
            id: any;
            name: any;
            depth: any;
            path: any;
            memberCount: number;
            subChannelCount: number;
            totalSubMembers: number;
            totalMembers: number;
        };
    }>;
    /**
     * 获取渠道维度的分销统计（委派 user-invite service）
     */
    getChannelDistributionStats(id: number): Promise<{
        stats: {
            id: any;
            name: any;
            code: any;
            depth: any;
            channelTier: any;
            path: any;
            directCustomerCount: any;
            subChannelCustomerCount: any;
            totalCustomerCount: any;
        };
    }>;
    /**
     * 获取公开渠道信息
     */
    getPublic(id: number): Promise<{
        id: any;
        name: any;
        description: any;
        channelTier: any;
        path: any;
        depth: any;
        createdAt: any;
    }>;
    /**
     * 获取用户可访问的渠道 ID 列表（委托给 channel-permission 服务，包含缓存）
     */
    getAccessibleChannelIds(userId: number): Promise<number[]>;
};
export default _default;
