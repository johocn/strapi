/**
 * 统一权限定义格式
 * 提供标准化的权限结构和类型定义
 */

export interface PluginPermission {
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'export' | 'import';
  resource: string;
  description: string;
  roles: string[];
}

export interface PermissionConfig {
  [permissionKey: string]: string[];
}

export const STANDARD_PERMISSIONS = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  publish: 'publish',
  export: 'export',
  import: 'import',
} as const;

export const ALL_ROLES = ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'] as const;

export type StandardPermission = typeof STANDARD_PERMISSIONS[keyof typeof STANDARD_PERMISSIONS];
export type RoleType = typeof ALL_ROLES[number];
