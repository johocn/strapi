import { jsx } from "react/jsx-runtime";
import { CarOutlined } from "@ant-design/icons";
const pluginId = "zhao-tire";
const PluginIcon = () => /* @__PURE__ */ jsx(CarOutlined, {});
const index = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "雪地胎寄存"
      },
      permissions: [
        {
          action: "plugin::zhao-tire.order.read",
          subject: null
        }
      ],
      Component: () => import("./App-BxfLRdwu.mjs").then((mod) => ({ default: mod.default }))
    });
    app.registerPlugin({
      id: pluginId,
      name: "雪地胎寄存"
    });
  },
  bootstrap(app) {
  }
};
export {
  index as default,
  pluginId
};
