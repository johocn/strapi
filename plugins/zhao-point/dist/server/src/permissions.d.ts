export declare const ROLES: {
    readonly ADMIN: "admin";
    readonly CHANNEL_ADMIN: "channel-admin";
    readonly PLUGIN_MANAGER: "plugin-manager";
    readonly INSTRUCTOR: "instructor";
    readonly USER: "user";
};
export interface PermissionEntry {
    allowRoles: string[];
}
export declare const PERMISSIONS: Record<string, PermissionEntry>;
export default PERMISSIONS;
