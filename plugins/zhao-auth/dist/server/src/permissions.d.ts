export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly CHANNEL_ADMIN: "channel-admin";
    readonly PLUGIN_MANAGER: "plugin-manager";
    readonly INSTRUCTOR: "instructor";
    readonly USER: "user";
};
export declare const ROLE_LABELS: Record<string, string>;
export type RoleKey = (typeof ROLES)[keyof typeof ROLES];
export interface PermissionItem {
    label: string;
    type: "menu" | "button";
    children?: Record<string, PermissionItem>;
}
export declare const PERMISSION_TREE: Record<string, PermissionItem>;
/** 递归展开权限树为扁平 key 数组 */
export declare function flattenPermissions(tree: Record<string, PermissionItem>): string[];
/** 获取权限 key 的所有子权限（含自身） */
export declare function expandPermissionKeys(keys: string[], tree?: Record<string, PermissionItem>): string[];
/** 获取权限项的 label（用于前端展示） */
export declare function getPermissionLabel(key: string, tree?: Record<string, PermissionItem>): string | null;
export declare const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]>;
