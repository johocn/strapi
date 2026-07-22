import { Core } from '@strapi/strapi';
export declare function invalidatePermissionCache(userId?: number, tenantDocumentId?: string): void;
/**
 * 初始化并同步默认角色权限（每次启动时调用）
 * - 创建角色时写入 seedVersion
 * - 系统角色：仅当 seedVersion 不一致时才覆盖 permissions（保留管理员手动编辑）
 * - 非系统角色：不覆盖
 */
export declare function initDefaultRoles(strapi: any): Promise<string[]>;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 获取权限树定义
     */
    getPermissionTree(): Record<string, import('../permissions').PermissionItem>;
    /**
     * 角色列表（分页）
     */
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
    /**
     * 获取所有角色（不分页，用于下拉）
     */
    getAllRoles(): Promise<{
        name: any;
        role: any;
        displayName: any;
        isSystem: boolean;
    }[]>;
    /**
     * 获取单个角色
     */
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
    /**
     * 创建角色
     */
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
    /**
     * 更新角色
     */
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
    /**
     * 删除角色（系统角色不允许删除）
     */
    deleteRole(roleName: string): Promise<{
        success: boolean;
        role: string;
    }>;
    /**
     * 获取某角色权限
     */
    getRolePermissions(role: string): Promise<{
        role: string;
        permissions: any;
    }>;
    /**
     * 更新某角色权限
     */
    updateRolePermissions(role: string, permissionKeys: string[]): Promise<{
        role: string;
        permissions: any;
    }>;
    /**
     * 获取当前用户的所有权限
     */
    getMyPermissions(userId: number, tenantDocumentId?: string): Promise<{
        permissions: string[];
    }>;
    /**
     * 解析合并后的 moduleVisibility（全局默认 ∩ 租户覆盖，交集收窄）
     */
    resolveModuleVisibility(tenantDocumentId?: string): Promise<Record<string, string[]>>;
    /**
     * 失效权限缓存（代理方法，供外部通过 strapi.plugin().service() 调用）
     */
    invalidateCache(userId?: number, tenantDocumentId?: string): void;
    /**
     * 初始化并同步默认角色权限（每次启动时调用）
     * 委托给模块级命名导出函数，按 seedVersion 决定是否覆盖权限
     */
    initDefaultRoles(): Promise<string[]>;
};
export default _default;
