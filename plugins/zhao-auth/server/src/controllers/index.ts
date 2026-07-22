import roleManagementController from "./role-management";
import authController from "./auth";
import permissionController from "./permission";
import roleChannelController from "./role-channel";
import tenantController from "./tenant";
import moduleVisibilityController from "./module-visibility";
import permissionMatrixController from "./permission-matrix";
import permissionCheckController from "./permission-check";

export default {
  "role-management": roleManagementController,
  auth: authController,
  permission: permissionController,
  "role-channel": roleChannelController,
  tenant: tenantController,
  "module-visibility": moduleVisibilityController,
  "permission-matrix": permissionMatrixController,
  "permission-check": permissionCheckController,
};
