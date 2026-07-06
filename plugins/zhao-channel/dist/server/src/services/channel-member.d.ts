import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    verifyInvitationCode(code: string): Promise<{
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
        };
    }>;
    getMyChannel(userId: number): Promise<{
        channel: {
            id: any;
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
    updateMyChannel(userId: number, data: {
        name?: string;
        description?: string;
    }): Promise<{
        channel: {
            id: any;
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
    inviteMember(channelId: number, inviterId: number, data: {
        email: string;
        role?: string;
    }): Promise<{
        invitation: {
            channel: {
                id: any;
                name: any;
            };
            user: {
                id: any;
                email: any;
                username: any;
            };
            isNewUser: boolean;
        };
    }>;
    getMembers(channelId: number): Promise<{
        members: {
            id: any;
            username: any;
            email: any;
            role: any;
            createdAt: any;
            updatedAt: any;
        }[];
    }>;
    removeMember(channelId: number, userId: number): Promise<any>;
    updateMemberRole(channelId: number, userId: number, newRole: string): Promise<any>;
    /**
     * 通过渠道邀请码加入渠道（C端/Web后台）
     */
    joinByInvite(userId: number, inviteCode: string): Promise<{
        channelId: any;
        channelName: any;
        role: any;
        isNewMember: boolean;
    }>;
    /**
     * 简单 CRUD 方法（管理端用）
     */
    find(query?: any): Promise<any[]>;
    findOne(id: number): Promise<any>;
    createMember(data: any): Promise<any>;
    updateMember(id: number, data: any): Promise<any>;
    deleteMember(id: number): Promise<any>;
    setCurrentChannel(userId: number, channelId: number): Promise<any>;
};
export default _default;
