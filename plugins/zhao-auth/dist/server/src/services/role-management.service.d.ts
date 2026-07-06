import { Core } from '@strapi/strapi';
import { UserPermissions } from '../utils/types';
/**
 * 角色层级定义 - 数值越高权限越大
 */
export declare const ROLE_HIERARCHY: Record<string, number>;
/**
 * 角色继承关系 - 定义各角色继承的父角色
 */
export declare const ROLE_INHERITANCE: Record<string, string[]>;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 查询用户列表
     * @param filters 筛选条件
     * @param page 页码
     * @param pageSize 每页数量
     */
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
    /**
     * 分配角色给用户
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     */
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
    /**
     * 获取用户角色列表
     * @param userId 用户ID
     */
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
    /**
     * 批量分配角色
     * @param userIds 用户ID列表
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     */
    batchAssignRoles(userIds: number[], role: string, operatorId: number, reason?: string): Promise<{
        success: boolean;
        message: string;
        results: {
            userId: number;
            success: boolean;
            message: string;
        }[];
    }>;
    /**
     * 记录操作日志
     * @param operatorId 操作人ID
     * @param targetUserId 目标用户ID
     * @param action 操作类型
     * @param role 角色名称
     * @param reason 操作原因
     */
    logAction(operatorId: number, targetUserId: number, action: "assign" | "revoke", role: string, reason?: string): Promise<void>;
    /**
     * 获取角色操作日志
     * @param userId 可选，按目标用户筛选
     * @param operatorId 可选，按操作人筛选
     * @param page 页码
     * @param pageSize 每页数量
     */
    getActionLogs(userId?: number, operatorId?: number, page?: number, pageSize?: number): Promise<{
        data: any[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            pageCount: number;
        };
    }>;
    /**
     * 检查用户是否具有特定权限（包含继承权限）
     * @param userId 用户ID
     * @param requiredRole 所需角色
     * @returns 是否具有权限
     */
    checkPermission(userId: number, requiredRole: string): Promise<boolean>;
    /**
     * 获取用户有效权限信息
     * @param userId 用户ID
     * @returns 用户权限信息
     */
    getUserEffectivePermissions(userId: number): Promise<UserPermissions>;
    /**
     * 清除用户权限缓存
     * @param userId 用户ID
     */
    invalidateUserCache(userId: number): Promise<void>;
    /**
     * 获取用户层级（取所有角色中的最高层级）
     * @param userId 用户ID
     * @returns 层级数值（1-100）
     */
    getUserLevel(userId: number): Promise<number>;
    /**
     * 根据角色列表计算权限映射
     * @param roles 用户角色列表
     * @returns 角色和权限映射
     */
    computePermissions(roles: string[]): {
        roles: string[];
        permissions: Record<string, boolean>;
    };
};
export default _default;
