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
  "course-category.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "course-category.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "course-category.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "course-category.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },

  "course.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "course.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "course.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "course.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "course.publish": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },

  "lesson.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "lesson.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "lesson.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "lesson.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },

  "user-course.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR] },
  "user-course.grant": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },

  "course-progress.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "course-progress.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },

  "lesson-progress.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "lesson-progress.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
};

export default PERMISSIONS;
