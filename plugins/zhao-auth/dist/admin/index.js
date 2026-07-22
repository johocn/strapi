"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const icons = require("@ant-design/icons");
const pluginId = "zhao-auth";
const index = {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: icons.LockOutlined,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "认证授权"
      },
      permissions: [{ action: "plugin::zhao-auth.user.manage", subject: null }],
      Component: async () => Promise.resolve().then(() => require("./App-D0lr5UJ0.js"))
    });
    app.registerPlugin({
      id: pluginId,
      name: "zhao-auth"
    });
  },
  bootstrap(app) {
  }
};
exports.default = index;
