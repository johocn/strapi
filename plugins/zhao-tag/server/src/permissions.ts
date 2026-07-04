export const ROLES = {
  ADMIN: "admin",
  CHANNEL_ADMIN: "channel-admin",
  PLUGIN_MANAGER: "plugin-manager",
  INSTRUCTOR: "instructor",
  USER: "user",
} as const;

export interface PermissionEntry {
  allowRoles: string[];
}

export type PermissionAction =
  | `${string}.${"read" | "create" | "update" | "delete" | "publish" | "grant"}`
  | `${string}.${string}`;

export const PERMISSIONS: Record<string, PermissionEntry> = {
  "tag.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "tag.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },

  "tag-index.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },

  "tag-group.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "tag-group.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag-group.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "tag-group.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
};

export default PERMISSIONS;
