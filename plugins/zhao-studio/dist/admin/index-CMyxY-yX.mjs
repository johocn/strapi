import { jsx } from "react/jsx-runtime";
import { RobotOutlined } from "@ant-design/icons";
const pluginId = "zhao-studio";
const PluginIcon = () => /* @__PURE__ */ jsx(RobotOutlined, {});
const index = {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "内容工作室"
      },
      permissions: [
        {
          action: "plugin::zhao-studio.read",
          subject: null
        }
      ],
      Component: async () => {
        const component = await import("./App-DKVv1LKR.mjs");
        return component;
      }
    });
    app.registerPlugin({
      id: pluginId,
      name: "内容工作室"
    });
  },
  bootstrap(app) {
  }
};
export {
  index as i,
  pluginId as p
};
