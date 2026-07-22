import authService from "./auth.service";
import jwtService from "./jwt.service";
import roleManagementService from "./role-management.service";
import permissionService from "./permission.service";
import channelScopeService from "./channel-scope.service";
import roleChannelService from "./role-channel.service";
import tenantService from "./tenant.service";
import permissionCheckService from "./permission-check.service";

export default {
  auth: authService,
  jwt: jwtService,
  "role-management": roleManagementService,
  permission: permissionService,
  "channel-scope": channelScopeService,
  "role-channel": roleChannelService,
  tenant: tenantService,
  "permission-check": permissionCheckService,
};
