import services from "./services";
import middlewares from "./middlewares";
import controllers from "./controllers";
import contentTypes from "./content-types";
import policies from "./policies";
import bootstrap from "./bootstrap";
import register from "./register";
import destroy from "./destroy";
import config from "./config";
import routes from "./routes";

export { hasPermission, hasAnyRole, getEffectiveRoles, validatePermissionFormat, parsePermission } from "./utils/permission-helpers";
export type { PermissionConfig, PluginPermission, StandardPermission, RoleType } from "./utils/permission-types";
export type { PolicyHandler, PolicyResult, PolicyConfig, AuthUser, AuthContext, JwtPayload, AuthService, JwtService, RoleHierarchy, RoleInheritance, UserPermissions, AuthMiddlewareConfig } from "./utils/types";

export default {
  register,
  bootstrap,
  destroy,
  config,
  services,
  controllers,
  contentTypes,
  policies,
  middlewares,
  routes,
};
