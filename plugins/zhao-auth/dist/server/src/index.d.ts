export { hasPermission, hasAnyRole, getEffectiveRoles, validatePermissionFormat, parsePermission } from './utils/permission-helpers';
export type { PermissionConfig, PluginPermission, StandardPermission, RoleType } from './utils/permission-types';
export type { PolicyHandler, PolicyResult, PolicyConfig, AuthUser, AuthContext, JwtPayload, AuthService, JwtService, RoleHierarchy, RoleInheritance, UserPermissions, AuthMiddlewareConfig } from './utils/types';
declare const _default: {
    register: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    bootstrap: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => Promise<void>;
    destroy: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => void;
    config: {
        default: {
            authenticate: {
                publicPaths: string[];
            };
            authorize: {
                policies: Array<{
                    name: string;
                    [key: string]: unknown;
                }>;
            };
        };
        validator: (config: Record<string, unknown>) => void;
    };
    services: {
        auth: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./utils/types').AuthService & Record<string, any>;
        jwt: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => import('./services/jwt.service').JwtService;
        "role-management": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findUsers(filters?: Record<string, any>, page?: number, pageSize?: number): Promise<{
                data: {
                    id: any;
                    documentId: any;
                    username: any;
                    email: any;
                    roles: string[];
                    createdAt: any;
                }[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            assignRole(userId: number, role: string, operatorId: number, reason?: string): Promise<{
                success: boolean;
                message: string;
                user: {
                    id: number;
                    roles: string[];
                };
            }>;
            revokeRole(userId: number, role: string, operatorId: number, reason?: string): Promise<{
                success: boolean;
                message: string;
                user: {
                    id: number;
                    roles: string[];
                };
            }>;
            getUserRoles(userId: number): Promise<{
                user: {
                    id: any;
                    email: any;
                    username: any;
                };
                roles: {
                    id: any;
                    name: string;
                    description: any;
                }[];
            }>;
            batchAssignRoles(userIds: number[], role: string, operatorId: number, reason?: string): Promise<{
                success: boolean;
                message: string;
                results: {
                    userId: number;
                    success: boolean;
                    message: string;
                }[];
            }>;
            logAction(operatorId: number, targetUserId: number, action: "assign" | "revoke", role: string, reason?: string): Promise<void>;
            getActionLogs(userId?: number, operatorId?: number, page?: number, pageSize?: number): Promise<{
                data: any[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            checkPermission(userId: number, requiredRole: string): Promise<boolean>;
            getUserEffectivePermissions(userId: number): Promise<import('./utils/types').UserPermissions>;
            invalidateUserCache(userId: number): Promise<void>;
            getUserLevel(userId: number): Promise<number>;
            computePermissions(roles: string[]): {
                roles: string[];
                permissions: Record<string, boolean>;
            };
        };
        permission: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getPermissionTree(): Record<string, import('./permissions').PermissionItem>;
            listRoles(page?: number, pageSize?: number, filters?: any): Promise<{
                list: {
                    id: any;
                    documentId: any;
                    name: any;
                    role: any;
                    displayName: any;
                    description: any;
                    isSystem: boolean;
                    permissions: any;
                    userCount: number;
                    createdAt: any;
                    updatedAt: any;
                }[];
                pagination: {
                    page: number;
                    pageSize: number;
                    total: number;
                    pageCount: number;
                };
            }>;
            getAllRoles(): Promise<{
                name: any;
                role: any;
                displayName: any;
                isSystem: boolean;
            }[]>;
            getRole(roleName: string): Promise<{
                id: any;
                documentId: any;
                name: any;
                role: any;
                displayName: any;
                description: any;
                isSystem: boolean;
                permissions: any;
                createdAt: any;
                updatedAt: any;
            }>;
            createRole(data: {
                role: string;
                displayName: string;
                description?: string;
                permissions?: string[];
                isSystem?: boolean;
                level?: number;
            }, operatorId: number, operatorLevel: number): Promise<{
                id: any;
                documentId: any;
                name: any;
                role: any;
                displayName: any;
                description: any;
                isSystem: boolean;
                permissions: any;
                level: any;
            }>;
            updateRole(roleName: string, data: {
                displayName?: string;
                description?: string;
                permissions?: string[];
            }): Promise<{
                id: any;
                documentId: any;
                name: any;
                role: any;
                displayName: any;
                description: any;
                isSystem: boolean;
                permissions: any;
            }>;
            deleteRole(roleName: string): Promise<{
                success: boolean;
                role: string;
            }>;
            getRolePermissions(role: string): Promise<{
                role: string;
                permissions: any;
            }>;
            updateRolePermissions(role: string, permissionKeys: string[]): Promise<{
                role: string;
                permissions: any;
            }>;
            getMyPermissions(userId: number): Promise<{
                permissions: string[];
            }>;
            initDefaultRoles(): Promise<string[]>;
        };
        "channel-scope": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            resolve(user: any): Promise<import('./services/channel-scope.service').ChannelScope>;
            buildChannelFilter(scope: import('./services/channel-scope.service').ChannelScope | undefined, field: string): Record<string, any> | null;
            assertRecordInScope(scope: import('./services/channel-scope.service').ChannelScope | undefined, record: any, field: string): void;
            assertChannelDocIdInScope(scope: import('./services/channel-scope.service').ChannelScope | undefined, channelDocumentId: string): Promise<void>;
            buildChannelFilterDeep(scope: import('./services/channel-scope.service').ChannelScope | undefined, path: string[]): Record<string, any> | null;
        };
        "role-channel": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
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
            getRoleChannelIds(roles: string[]): Promise<number[]>;
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
            batchGrant(data: {
                role: string;
                channelIds: number[];
                grantedBy?: number;
            }): Promise<{
                results: any[];
            }>;
            revoke(id: number): Promise<{
                success: boolean;
                id: number;
                role: any;
            }>;
            revokeByRole(role: string): Promise<{
                success: boolean;
                role: string;
                deleted: number;
            }>;
        };
        tenant: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getMyTenants(userId: number, roles: string[]): Promise<{
                id: any;
                documentId: any;
                name: any;
                domain: any;
            }[]>;
        };
    };
    controllers: {
        "role-management": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            findUsers(ctx: any): Promise<void>;
            assignRole(ctx: any): Promise<void>;
            revokeRole(ctx: any): Promise<void>;
            getUserRoles(ctx: any): Promise<void>;
            batchAssignRoles(ctx: any): Promise<void>;
            getActionLogs(ctx: any): Promise<void>;
            getMyRoles(ctx: any): Promise<void>;
            getMyPermissions(ctx: any): Promise<void>;
        };
        auth: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            register(ctx: any): Promise<void>;
            resetPassword(ctx: any): Promise<void>;
            adminLocal(ctx: any): Promise<void>;
            login(ctx: any): Promise<void>;
            config(ctx: any): Promise<void>;
            checkThirdPartyEnabled(): Promise<boolean>;
        };
        permission: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getTree(ctx: any): Promise<void>;
            listRoles(ctx: any): Promise<void>;
            getAllRoles(ctx: any): Promise<void>;
            getRole(ctx: any): Promise<void>;
            createRole(ctx: any): Promise<void>;
            updateRole(ctx: any): Promise<void>;
            deleteRole(ctx: any): Promise<void>;
            getRolePermissions(ctx: any): Promise<void>;
            updateRolePermissions(ctx: any): Promise<void>;
            initRoles(ctx: any): Promise<void>;
            getMyPermissions(ctx: any): Promise<void>;
            getMyChannelScope(ctx: any): Promise<void>;
        };
        "role-channel": ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            list(ctx: any): Promise<void>;
            grant(ctx: any): Promise<void>;
            batchGrant(ctx: any): Promise<void>;
            revoke(ctx: any): Promise<void>;
            revokeByRole(ctx: any): Promise<void>;
        };
        tenant: ({ strapi }: {
            strapi: import('@strapi/types/dist/core').Strapi;
        }) => {
            getMyTenants(ctx: any): Promise<void>;
        };
    };
    contentTypes: {
        permission: {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                };
                attributes: {
                    role: {
                        type: string;
                        required: boolean;
                        unique: boolean;
                        maxLength: number;
                    };
                    displayName: {
                        type: string;
                        required: boolean;
                        maxLength: number;
                    };
                    description: {
                        type: string;
                    };
                    permissions: {
                        type: string;
                        required: boolean;
                        default: any[];
                    };
                    isSystem: {
                        type: string;
                        required: boolean;
                        default: boolean;
                    };
                    level: {
                        type: string;
                        default: number;
                        min: number;
                        max: number;
                    };
                };
            };
        };
        "role-action-log": {
            schema: {
                kind: string;
                collectionName: string;
                info: {
                    name: string;
                    description: string;
                    singularName: string;
                    pluralName: string;
                    displayName: string;
                };
                options: {
                    draftAndPublish: boolean;
                    timestamps: boolean;
                };
                attributes: {
                    operatorId: {
                        type: string;
                        required: boolean;
                        description: string;
                    };
                    targetUserId: {
                        type: string;
                        required: boolean;
                        description: string;
                    };
                    action: {
                        type: string;
                        required: boolean;
                        enum: string[];
                        description: string;
                    };
                    role: {
                        type: string;
                        required: boolean;
                        description: string;
                    };
                    reason: {
                        type: string;
                        description: string;
                    };
                    timestamp: {
                        type: string;
                        required: boolean;
                        description: string;
                    };
                };
            };
        };
        "role-channel": {
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
                    role: {
                        type: string;
                        required: boolean;
                    };
                    channel: {
                        type: string;
                        relation: string;
                        target: string;
                    };
                    assignedBy: {
                        type: string;
                    };
                };
            };
        };
    };
    policies: {
        "is-authenticated": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "has-permission": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "has-channel-access": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "has-channel-scope": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
        "has-tenant-access": (policyContext: any, config: any, { strapi }: {
            strapi: any;
        }) => Promise<boolean>;
    };
    middlewares: {};
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
        tenant: {
            type: "content-api";
            routes: {
                method: string;
                path: string;
                handler: string;
                config: {
                    auth: boolean;
                    policies: string[];
                };
            }[];
        };
    };
};
export default _default;
