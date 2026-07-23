"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@ant-design/icons");
const pluginId = "zhao-studio";
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.RobotOutlined, {});
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
          action: "zhao-studio.read",
          subject: null
        }
      ],
      Component: async () => {
        const component = await Promise.resolve().then(() => require("./App-BDxNGB00.js"));
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
exports.default = index;
