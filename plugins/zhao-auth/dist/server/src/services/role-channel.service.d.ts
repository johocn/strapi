import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 角色渠道列表（分页）
     */
    listRoleChannels(page?: number, pageSize?: number, filters?: any): Promise<{
        list: {
            id: any;
            role: any;
            channel: {
                id: any;
                name: any;
                code: any;
            };
            grantedBy: {
                id: any;
                username: any;
            };
            createdAt: any;
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /**
     * 查询角色被授权的所有渠道 ID
     */
    getRoleChannelIds(roles: string[]): Promise<number[]>;
    /**
     * 授权角色渠道（单个）
     */
    grant(data: {
        role: string;
        channelId: number;
        grantedBy?: number;
    }): Promise<{
        id: any;
        role: any;
        channel: {
            id: number;
            name: any;
            code: any;
        };
        grantedBy?: undefined;
        createdAt?: undefined;
    } | {
        id: any;
        role: any;
        channel: {
            id: any;
            name: any;
            code: any;
        };
        grantedBy: {
            id: any;
            username: any;
        };
        createdAt: any;
    }>;
    /**
     * 批量授权
     */
    batchGrant(data: {
        role: string;
        channelIds: number[];
        grantedBy?: number;
    }): Promise<{
        results: any[];
    }>;
    /**
     * 撤销角色渠道
     */
    revoke(id: number): Promise<{
        success: boolean;
        id: number;
        role: any;
    }>;
    /**
     * 按角色名删除
     */
    revokeByRole(role: string): Promise<{
        success: boolean;
        role: string;
        deleted: number;
    }>;
};
export default _default;
