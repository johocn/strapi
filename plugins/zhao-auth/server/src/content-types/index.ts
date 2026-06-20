import permissionSchema from "./permission/schema.json";
import roleActionLogSchema from "./role-action-log/schema.json";
import roleChannelSchema from "./role-channel/schema.json";

export default {
  permission: {
    schema: permissionSchema,
  },
  "role-action-log": {
    schema: roleActionLogSchema,
  },
  "role-channel": {
    schema: roleChannelSchema,
  },
};
