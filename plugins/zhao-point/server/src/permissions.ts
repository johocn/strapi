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

export const PERMISSIONS: Record<string, PermissionEntry> = {
  "point-config.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-config.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point-rule.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-rule.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-rule.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-rule.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point.grant": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.USER] },
  "point-redeem": { allowRoles: [ROLES.USER] },
  "point-record.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.USER] },
  "point-product.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.INSTRUCTOR, ROLES.USER] },
  "point-product.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-product.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-product.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point-redemption.approve": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-redemption.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER, ROLES.USER] },
  "pickup-location.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "pickup-location.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "pickup-location.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "pickup-location.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point-exchange.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-exchange.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-type.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-type.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-type.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-type.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point-template.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-template.create": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-template.update": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-template.delete": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN] },
  "point-verification.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
  "point-dashboard.read": { allowRoles: [ROLES.ADMIN, ROLES.CHANNEL_ADMIN, ROLES.PLUGIN_MANAGER] },
};

export default PERMISSIONS;
