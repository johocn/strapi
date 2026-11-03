"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@ant-design/icons");
const pluginId = "zhao-tire";
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.CarOutlined, {});
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
      Component: () => Promise.resolve().then(() => require("./App-Bz8TK6Z6.js")).then((mod) => ({ default: mod.default }))
    });
    app.registerPlugin({
      id: pluginId,
      name: "雪地胎寄存"
    });
  },
  bootstrap(app) {
  }
};
exports.default = index;
exports.pluginId = pluginId;
