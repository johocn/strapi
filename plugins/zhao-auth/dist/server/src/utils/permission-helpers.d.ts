import { PermissionConfig } from './permission-types';
/**
 * 检查用户是否具有特定权限
 * @param userRoles 用户角色列表
 * @param requiredPermission 所需权限
 * @param permissionConfig 权限配置
 * @returns 是否具有权限
 */
export declare function hasPermission(userRoles: string[], requiredPermission: string, permissionConfig: PermissionConfig): boolean;
/**
 * 检查用户是否具有任意所需角色
 * @param userRoles 用户角色列表
 * @param requiredRoles 所需角色列表
 * @returns 是否具有任意所需角色
 */
export declare function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean;
/**
 * 获取用户的有效角色（包括继承的角色）
 * @param userRoles 用户直接角色列表
 * @returns 包含继承角色的完整角色列表
 */
export declare function getEffectiveRoles(userRoles: string[]): string[];
/**
 * 验证权限格式是否正确
 * @param permission 权限字符串
 * @returns 格式是否正确
 */
export declare function validatePermissionFormat(permission: string): boolean;
/**
 * 解析权限字符串
 * @param permission 权限字符串（如 "plugin:read" 或 "content.create"）
 * @returns 解析后的权限对象
 */
export declare function parsePermission(permission: string): {
    plugin?: string;
    action: string;
    resource?: string;
} | null;
