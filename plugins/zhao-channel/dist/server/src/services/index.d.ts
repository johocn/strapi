declare const _default: {
    channel: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
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
        delete(id: number): Promise<{
            affectedUsers: number;
            deletedChannels: number;
            deletedMembers: number;
            deletedUserChannels: number;
            deletedRoleChannels: number;
        }>;
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
        getHierarchy(id: number): Promise<{
            hierarchy: any;
        }>;
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
        getPublic(id: number): Promise<{
            id: any;
            name: any;
            description: any;
            channelTier: any;
            path: any;
            depth: any;
            createdAt: any;
        }>;
        getAccessibleChannelIds(userId: number): Promise<number[]>;
    };
    "channel-member": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
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
        joinByInvite(userId: number, inviteCode: string): Promise<{
            channelId: any;
            channelName: any;
            role: any;
            isNewMember: boolean;
        }>;
        find(query?: any): Promise<any[]>;
        findOne(id: number): Promise<any>;
        createMember(data: any): Promise<any>;
        updateMember(id: number, data: any): Promise<any>;
        deleteMember(id: number): Promise<any>;
        setCurrentChannel(userId: number, channelId: number): Promise<any>;
    };
    "channel-permission": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
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
        getMyChannelTree(userId: number): Promise<any[]>;
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
        getUserDirectChannels(userId: number): Promise<number[]>;
        ROLE_LEVELS: Record<string, number>;
        checkUserChannelPermission(userId: number, channelId: number): Promise<boolean>;
        getChannelMemberRole(userId: number, channelId: number): Promise<{
            role: string;
            level: number;
            isCurrent: boolean;
        }>;
        checkChannelMemberRole(userId: number, channelId: number, minLevel: number): Promise<boolean>;
    };
    "user-invite": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        generateUniqueCode(): Promise<string>;
        createForUser(userId: number, inviterCode?: string, inviteChannelId?: number, externalInviteCode?: string, channelCode?: string): Promise<any>;
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
        findByInviteCode(code: string): Promise<any>;
        findByUserId(userId: number): Promise<any>;
        getDistributionChain(userId: number): Promise<{
            id: number;
            username: any;
            email: any;
            depth: number;
        }[]>;
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
        useInvite(code: string, usedByUserId: number): Promise<any>;
        getChannelDistributionStats(channelId: number): Promise<{
            channelId: number;
            directCustomerCount: number;
            subChannelCustomerCount: number;
            totalCustomerCount: number;
        }>;
    };
    "channel-stats": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        getCourseStats(channelIds: number[]): Promise<import('./channel-stats.service').StatsResult>;
        getUserStats(channelIds: number[]): Promise<import('./channel-stats.service').StatsResult>;
        getQuizStats(channelIds: number[]): Promise<import('./channel-stats.service').StatsResult>;
        getPointStats(channelIds: number[]): Promise<import('./channel-stats.service').StatsResult>;
        getDashboard(channelScope: {
            all: boolean;
            channelIds: number[];
        }): Promise<import('./channel-stats.service').DashboardResult>;
        getAllChannelIds(): Promise<number[]>;
    };
};
export default _default;
