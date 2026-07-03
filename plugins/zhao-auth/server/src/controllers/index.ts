import roleManagementController from "./role-management";
import authController from "./auth";
import permissionController from "./permission";
import roleChannelController from "./role-channel";
import tenantController from "./tenant";

export default {
  "role-management": roleManagementController,
  auth: authController,
  permission: permissionController,
  "role-channel": roleChannelController,
  tenant: tenantController,
};
