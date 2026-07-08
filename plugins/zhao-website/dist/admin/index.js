"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@ant-design/icons");
const pluginId = "zhao-website";
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.GlobalOutlined, {});
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
        const component = await Promise.resolve().then(() => require("./App-Df0XfoCO.js"));
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
exports.default = index;
exports.pluginId = pluginId;
