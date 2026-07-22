import { LockOutlined } from "@ant-design/icons";
const pluginId = "zhao-auth";
const index = {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: LockOutlined,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "认证授权"
      },
      permissions: [{ action: "plugin::zhao-auth.user.manage", subject: null }],
      Component: async () => import("./App-Dg_5o8Bo.mjs")
    });
    app.registerPlugin({
      id: pluginId,
      name: "zhao-auth"
    });
  },
  bootstrap(app) {
  }
};
export {
  index as default
};
