import { jsx } from "react/jsx-runtime";
import { RobotOutlined } from "@ant-design/icons";
const pluginId = "zhao-studio";
const PluginIcon = () => /* @__PURE__ */ jsx(RobotOutlined, {});
const index = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "内容工作室"
      },
      permissions: [
        {
          action: "zhao-studio.read",
          subject: null
        }
      ],
      Component: () => import("./App-C61re12k.mjs").then((mod) => ({ default: mod.default }))
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
  index as default
};
