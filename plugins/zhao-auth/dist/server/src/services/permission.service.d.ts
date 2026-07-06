import { Core } from '@strapi/strapi';
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
    getMyPermissions(userId: number): Promise<{
        permissions: string[];
    }>;
    /**
     * 初始化并同步默认角色权限（每次启动时调用）
     * 系统角色的权限会与代码配置保持同步
     */
    initDefaultRoles(): Promise<string[]>;
};
export default _default;
