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
export declare const STANDARD_PERMISSIONS: {
    readonly create: "create";
    readonly read: "read";
    readonly update: "update";
    readonly delete: "delete";
    readonly publish: "publish";
    readonly export: "export";
    readonly import: "import";
};
export declare const ALL_ROLES: readonly ["admin", "channel-admin", "plugin-manager", "instructor", "user"];
export type StandardPermission = typeof STANDARD_PERMISSIONS[keyof typeof STANDARD_PERMISSIONS];
export type RoleType = typeof ALL_ROLES[number];
