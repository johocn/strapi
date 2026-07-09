export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly CHANNEL_ADMIN: "channel-admin";
    readonly PLUGIN_MANAGER: "plugin-manager";
    readonly INSTRUCTOR: "instructor";
    readonly USER: "user";
    readonly WEBSITE_MANAGER: "website-manager";
    readonly WEBSITE_EDITOR: "website-editor";
    readonly LOGISTICS_MANAGER: "logistics-manager";
    readonly LOGISTICS_EDITOR: "logistics-editor";
    readonly COURSE_MANAGER: "course-manager";
    readonly COURSE_EDITOR: "course-editor";
    readonly STUDY_MANAGER: "study-manager";
    readonly STUDY_EDITOR: "study-editor";
    readonly QUIZ_MANAGER: "quiz-manager";
    readonly QUIZ_EDITOR: "quiz-editor";
    readonly POINT_MANAGER: "point-manager";
    readonly POINT_EDITOR: "point-editor";
    readonly MARKETING_MANAGER: "marketing-manager";
    readonly MARKETING_EDITOR: "marketing-editor";
    readonly SYSTEM_MANAGER: "system-manager";
    readonly SYSTEM_EDITOR: "system-editor";
    readonly TAG_MANAGER: "tag-manager";
    readonly TAG_EDITOR: "tag-editor";
    readonly STUDIO_MANAGER: "studio-manager";
    readonly STUDIO_EDITOR: "studio-editor";
    readonly WEALTH_MANAGER: "wealth-manager";
    readonly WEALTH_EDITOR: "wealth-editor";
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
/** 提取指定中心的全部权限 key（含中心 menu key 自身）*/
export declare function centerPermissions(centerKey: string): string[];
/** 提取指定中心的编辑权限（排除 delete/manage）*/
export declare function centerEditorPermissions(centerKey: string): string[];
/** 获取权限 key 的所有子权限（含自身） */
export declare function expandPermissionKeys(keys: string[], tree?: Record<string, PermissionItem>): string[];
/** 获取权限项的 label（用于前端展示） */
export declare function getPermissionLabel(key: string, tree?: Record<string, PermissionItem>): string | null;
export declare const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]>;
