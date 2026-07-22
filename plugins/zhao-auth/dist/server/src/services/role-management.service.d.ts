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
/**
 * 检查用户是否具有特定权限（委托给 permission.service.getMyPermissions）
 * 通过 this.strapi 获取 strapi 实例，便于在测试中用 checkPermission.call({ strapi }, ...) 调用
 * @param this 上下文，需包含 strapi
 * @param userId 用户ID
 * @param action 权限 key
 * @param tenantDocumentId 租户 documentId（可选）
 * @returns 是否具有权限
 */
export declare function checkPermission(this: {
    strapi: Core.Strapi;
}, userId: number, action: string, tenantDocumentId?: string): Promise<boolean>;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 查询用户列表
     * @param filters 筛选条件（支持 username/email/role）
     * @param page 页码
     * @param pageSize 每页数量
     * @param operatorId 操作者 ID（用于租户过滤）
     * @param tenantDocumentId 当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
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
    /**
     * 分配角色给用户
     *
     * 业务约束：
     * - channel-admin 角色仅可分配给 ADMIN_CHANNEL_TIERS 渠道所有者
     * - 非 admin 操作者只能分配自己拥有的角色（子集校验，ROLE_006）
     * - 非 admin 操作者只能分配自己渠道内成员（ROLE_005）
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId（来自 ctx.state.siteDocumentId）
     */
    assignRole(userId: number, role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
        success: boolean;
        message: string;
        user: {
            id: number;
            roles: string[];
        };
    }>;
    /**
     * 撤销用户角色
     * - 非 admin：渠道校验（只能撤销自己渠道内成员）+ 子集校验（只能撤销自己拥有的角色）
     * - 保留"至少一个角色"校验
     *
     * @param userId 用户ID
     * @param role 角色名称
     * @param operatorId 操作人ID
     * @param reason 操作原因
     * @param operatorTenantDocumentId 操作者当前租户 documentId
     */
    revokeRole(userId: number, role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
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
     * 获取用户详情（含角色来源标注）
     * @param userId 目标用户 ID
     * @param operatorId 操作者 ID（保留参数，便于未来加审计）
     * @param tenantDocumentId 当前租户 documentId
     */
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
    /**
     * 获取当前操作者可分配的角色列表
     * - admin：返回全部角色（ROLES 全集 + 数据库自定义角色）
     * - 非 admin：返回"拥有的角色全集"（zhaoRoles ∪ moduleVisibility 自动授权）
     *
     * @param operatorId 操作者 ID
     * @param tenantDocumentId 当前租户 documentId
     */
    getAssignableRoles(operatorId: number, tenantDocumentId?: string): Promise<{
        roles: {
            role: string;
            label: string;
            source: "core" | "auto" | "explicit";
        }[];
        isAdmin: boolean;
    }>;
    /**
     * 批量分配角色
     * 透传 operatorTenantDocumentId 给 assignRole，自动执行子集校验
     */
    batchAssignRoles(userIds: number[], role: string, operatorId: number, reason?: string, operatorTenantDocumentId?: string): Promise<{
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
     * 检查用户是否具有特定权限（委托给 permission.service.getMyPermissions）
     * @param userId 用户ID
     * @param action 权限 key
     * @param tenantDocumentId 租户 documentId（可选）
     * @returns 是否具有权限
     */
    checkPermission(userId: number, action: string, tenantDocumentId?: string): Promise<boolean>;
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
