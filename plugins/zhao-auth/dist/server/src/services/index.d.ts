declare const _default: {
    auth: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('..').AuthService & Record<string, any>;
    jwt: ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => import('./jwt.service').JwtService;
    "role-management": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        findUsers(filters?: Record<string, any>, page?: number, pageSize?: number, operatorId?: number, tenantDocumentId?: string): Promise<{
            list: {
                id: any;
                documentId: any;
                username: any;
                email: any;
                roles: any[];
                roleSources: {
                    role: string;
                    label: any;
                    source: "explicit";
                    sourceDescription: string;
                    assignedByRole: any;
                    assignedAt: any;
                }[];
                createdAt: any;
            }[];
            pagination: {
                page: number;
                pageSize: number;
                total: number;
                pageCount: number;
            };
        }>;
        assignRole(userId: number, role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
            success: boolean;
            message: string;
            user: {
                id: number;
                roles: string[];
            };
        }>;
        revokeRole(userId: number, role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
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
        getUserDetail(userId: number, operatorId?: number, tenantDocumentId?: string): Promise<{
            user: {
                id: any;
                username: any;
                email: any;
                createdAt: any;
            };
            roles: {
                role: string;
                label: any;
                source: "explicit";
                sourceDescription: string;
                assignedByRole: any;
                assignedAt: any;
            }[];
            rolesBySource: {
                core: {
                    role: string;
                    label: any;
                    source: "explicit";
                    sourceDescription: string;
                    assignedByRole: any;
                    assignedAt: any;
                }[];
                auto: {
                    role: string;
                    label: any;
                    source: "explicit";
                    sourceDescription: string;
                    assignedByRole: any;
                    assignedAt: any;
                }[];
                explicit: {
                    role: string;
                    label: any;
                    source: "explicit";
                    sourceDescription: string;
                    assignedByRole: any;
                    assignedAt: any;
                }[];
            };
        }>;
        getAssignableRoles(operatorId: number, tenantDocumentId?: string): Promise<{
            roles: {
                role: string;
                label: string;
                source: "core" | "auto" | "explicit";
            }[];
            isAdmin: boolean;
        }>;
        batchAssignRoles(userIds: number[], role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
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
        checkPermission(userId: number, action: string, tenantDocumentId?: string): Promise<boolean>;
        getUserEffectivePermissions(userId: number): Promise<import('..').UserPermissions>;
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
        getPermissionTree(): Record<string, import('../permissions').PermissionItem>;
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
        getMyPermissions(userId: number, tenantDocumentId?: string): Promise<{
            permissions: string[];
        }>;
        resolveModuleVisibility(tenantDocumentId?: string): Promise<Record<string, string[]>>;
        invalidateCache(userId?: number, tenantDocumentId?: string): void;
        initDefaultRoles(): Promise<string[]>;
    };
    "channel-scope": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        resolve(user: any): Promise<import('./channel-scope.service').ChannelScope>;
        buildChannelFilter(scope: import('./channel-scope.service').ChannelScope | undefined, field: string): Record<string, any> | null;
        assertRecordInScope(scope: import('./channel-scope.service').ChannelScope | undefined, record: any, field: string): void;
        assertChannelDocIdInScope(scope: import('./channel-scope.service').ChannelScope | undefined, channelDocumentId: string): Promise<void>;
        buildChannelFilterDeep(scope: import('./channel-scope.service').ChannelScope | undefined, path: string[]): Record<string, any> | null;
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
            siteName: any;
            domain: any;
            featureFlags: any;
            channelsCount: any;
            templateName: any;
            updatedAt: any;
        }[]>;
    };
    "permission-check": ({ strapi }: {
        strapi: import('@strapi/types/dist/core').Strapi;
    }) => {
        checkPermission(userId: number, action: string, tenantDocumentId?: string): Promise<{
            allowed: boolean;
            reasons: string[];
        }>;
    };
};
export default _default;
