declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    destroy: ({ strapi: _strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    config: {
        default: {};
        validator(): void;
    };
    controllers: {
        channel: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            _scopeSvc(): import('@strapi/types/dist/core').Service;
            _channelFilter(ctx: any, field: string): Record<string, any> | null;
            _assertInScope(ctx: any, record: any, field: string): void;
            find(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
            register(ctx: any): Promise<void>;
            validate(ctx: any): Promise<void>;
            validatePublic(ctx: any): Promise<void>;
            registerPublic(ctx: any): Promise<void>;
            getNetwork(ctx: any): Promise<void>;
            getStats(ctx: any): Promise<void>;
            getPublic(ctx: any): Promise<void>;
            adminFind(ctx: any): Promise<void>;
            adminFindOne(ctx: any): Promise<void>;
            adminCreate(ctx: any): Promise<void>;
            adminCreateRoot(ctx: any): Promise<void>;
            adminGetChildren(ctx: any): Promise<void>;
            adminGetHierarchy(ctx: any): Promise<void>;
            adminUpdate(ctx: any): Promise<void>;
            updateConfig(ctx: any): Promise<void>;
            adminDelete(ctx: any): Promise<void>;
            adminGetTierTree(ctx: any): Promise<void>;
        };
        "channel-member": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            _scopeSvc(): import('@strapi/types/dist/core').Service;
            _channelFilter(ctx: any, field: string): Record<string, any> | null;
            _assertInScope(ctx: any, record: any, field: string): void;
            find(ctx: any): Promise<void>;
            findOne(ctx: any): Promise<void>;
            create(ctx: any): Promise<void>;
            update(ctx: any): Promise<void>;
            delete(ctx: any): Promise<void>;
        };
        "channel-permission": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            checkPermission(ctx: any): Promise<void>;
            getUserChannels(ctx: any): Promise<void>;
            getMyChannelTree(ctx: any): Promise<void>;
            batchGrant(ctx: any): Promise<void>;
        };
        "user-invite": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            _scopeSvc(): import('@strapi/types/dist/core').Service;
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
            syncInvite(ctx: any): Promise<void>;
        };
        "channel-invite": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            join(ctx: any): Promise<void>;
        };
        "channel-stats": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getDashboard(ctx: any): Promise<void>;
        };
    };
    routes: {
        "content-api": {
            type: "content-api";
            routes: {
                method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                };
            }[];
        };
    };
    services: {
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
            getCourseStats(channelIds: number[]): Promise<import('./services/channel-stats.service').StatsResult>;
            getUserStats(channelIds: number[]): Promise<import('./services/channel-stats.service').StatsResult>;
            getQuizStats(channelIds: number[]): Promise<import('./services/channel-stats.service').StatsResult>;
            getPointStats(channelIds: number[]): Promise<import('./services/channel-stats.service').StatsResult>;
            getDashboard(channelScope: {
                all: boolean;
                channelIds: number[];
            }): Promise<import('./services/channel-stats.service').DashboardResult>;
            getAllChannelIds(): Promise<number[]>;
        };
    };
    contentTypes: {
        channel: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    name: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    code: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    channelTier: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    parentChannel: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    childChannels: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    sites: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                    };
                    members: {
                        type: string;
                        relation: string;
                        target: string;
                        mappedBy: string;
                    };
                    status: {
                        type: string;
                        default: boolean;
                    };
                    description: {
                        type: string;
                    };
                    path: {
                        type: string;
                    };
                    depth: {
                        type: string;
                        default: number;
                        min: number;
                        max: number;
                    };
                    extraConfig: {
                        type: string;
                        default: string;
                    };
                };
            };
        };
        "channel-member": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                        inversedBy: string;
                        required: boolean;
                    };
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    role: {
                        type: string;
                        enum: string[];
                        default: string;
                        required: boolean;
                    };
                    invitedBy: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    isCurrent: {
                        type: string;
                        default: boolean;
                    };
                };
            };
        };
        "user-channel": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                    };
                    grantedBy: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    grantedAt: {
                        type: string;
                    };
                };
            };
        };
        "user-invite": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                    description: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    user: {
                        type: string;
                        relation: string;
                        target: string;
                        required: boolean;
                        unique: boolean;
                    };
                    inviteCode: {
                        type: string;
                        unique: boolean;
                        required: boolean;
                        maxLength: number;
                    };
                    invitedBy: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    inviteChannel: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    inviteMethod: {
                        type: string;
                        enum: string[];
                        default: string;
                    };
                    distributionPath: {
                        type: string;
                    };
                    distributionDepth: {
                        type: string;
                        default: number;
                        min: number;
                        max: number;
                    };
                    used: {
                        type: string;
                        default: boolean;
                    };
                    expiresAt: {
                        type: string;
                    };
                };
            };
        };
    };
    policies: {
        "sso-app-auth": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    middlewares: {};
};
export default _default;
