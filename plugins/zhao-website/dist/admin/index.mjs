import { jsx } from "react/jsx-runtime";
import { GlobalOutlined } from "@ant-design/icons";
const pluginId = "zhao-website";
const PluginIcon = () => /* @__PURE__ */ jsx(GlobalOutlined, {});
const index = {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "官网管理"
      },
      permissions: [
        {
          action: "plugin::zhao-website.read",
          subject: null
        }
      ],
      Component: async () => {
        const component = await import("./App-BAeonvPe.mjs");
        return component;
      }
    });
    app.registerPlugin({
      id: pluginId,
      name: "官网管理"
    });
  },
  bootstrap(app) {
  }
};
export {
  index as default,
  pluginId
};
