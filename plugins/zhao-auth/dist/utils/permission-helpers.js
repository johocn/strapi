"use strict";
/**
 * 权限验证工具函数
 * 提供权限检查、角色验证等辅助功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.hasAnyRole = hasAnyRole;
exports.getEffectiveRoles = getEffectiveRoles;
exports.validatePermissionFormat = validatePermissionFormat;
exports.parsePermission = parsePermission;
const role_management_service_1 = require("../services/role-management.service");
/**
 * 检查用户是否具有特定权限
 * @param userRoles 用户角色列表
 * @param requiredPermission 所需权限
 * @param permissionConfig 权限配置
 * @returns 是否具有权限
 */
function hasPermission(userRoles, requiredPermission, permissionConfig) {
    if (!userRoles || userRoles.length === 0) {
        return false;
    }
    const effectiveRoles = getEffectiveRoles(userRoles);
    for (const role of effectiveRoles) {
        const permissions = permissionConfig[role];
        if (permissions && permissions.includes(requiredPermission)) {
            return true;
        }
        if (permissions && permissions.includes('*')) {
            return true;
        }
    }
    return false;
}
/**
 * 检查用户是否具有任意所需角色
 * @param userRoles 用户角色列表
 * @param requiredRoles 所需角色列表
 * @returns 是否具有任意所需角色
 */
function hasAnyRole(userRoles, requiredRoles) {
    if (!userRoles || userRoles.length === 0) {
        return false;
    }
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }
    const effectiveRoles = getEffectiveRoles(userRoles);
    return requiredRoles.some(requiredRole => effectiveRoles.includes(requiredRole));
}
/**
 * 获取用户的有效角色（包括继承的角色）
 * @param userRoles 用户直接角色列表
 * @returns 包含继承角色的完整角色列表
 */
function getEffectiveRoles(userRoles) {
    if (!userRoles || userRoles.length === 0) {
        return [];
    }
    const effectiveSet = new Set(userRoles);
    for (const role of userRoles) {
        const inheritedRoles = role_management_service_1.ROLE_INHERITANCE[role];
        if (inheritedRoles) {
            for (const inheritedRole of inheritedRoles) {
                effectiveSet.add(inheritedRole);
            }
        }
    }
    return Array.from(effectiveSet);
}
/**
 * 验证权限格式是否正确
 * @param permission 权限字符串
 * @returns 格式是否正确
 */
function validatePermissionFormat(permission) {
    if (!permission || typeof permission !== 'string') {
        return false;
    }
    const validFormats = [
        /^[a-z]+:[a-z_]+$/,
        /^[a-z]+\.[a-z_]+$/,
    ];
    return validFormats.some(format => format.test(permission));
}
/**
 * 解析权限字符串
 * @param permission 权限字符串（如 "plugin:read" 或 "content.create"）
 * @returns 解析后的权限对象
 */
function parsePermission(permission) {
    if (!validatePermissionFormat(permission)) {
        return null;
    }
    if (permission.includes(':')) {
        const [plugin, action] = permission.split(':');
        return { plugin, action };
    }
    if (permission.includes('.')) {
        const [resource, action] = permission.split('.');
        return { resource, action };
    }
    return null;
}
