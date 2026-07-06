"use strict";
const jsxRuntime = require("react/jsx-runtime");
const icons = require("@strapi/icons");
const react = require("react");
const __variableDynamicImportRuntimeHelper = (glob, path, segs) => {
  const v = glob[path];
  if (v) {
    return typeof v === "function" ? v() : Promise.resolve(v);
  }
  return new Promise((_, reject) => {
    (typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(
      reject.bind(
        null,
        new Error(
          "Unknown variable dynamic import: " + path + (path.split("/").length !== segs ? ". Note that variables only represent file names one level deep." : "")
        )
      )
    );
  });
};
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.PuzzlePiece, {});
const strapi = { "name": "zhao-point" };
const pluginPkg = {
  strapi
};
const PLUGIN_ID = pluginPkg.strapi.name;
const Initializer = ({ setPlugin }) => {
  const ref = react.useRef(setPlugin);
  react.useEffect(() => {
    ref.current(PLUGIN_ID);
  }, []);
  return null;
};
const index = {
  register(app) {
    app.addMenuLink({
      to: `plugins/zhao-point`,
      icon: PluginIcon,
      intlLabel: {
        id: "zhao-point.plugin.name",
        defaultMessage: "积分管理"
      },
      Component: async () => {
        const { App } = await Promise.resolve().then(() => require("./App-BK6CECIs.js"));
        return App;
      }
    });
    app.registerPlugin({
      id: "zhao-point",
      initializer: Initializer,
      isReady: false,
      name: "积分管理"
    });
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => Promise.resolve().then(() => require("./en-Bl9a7uAy.js")), "./translations/zh-Hans.json": () => Promise.resolve().then(() => require("./zh-Hans-DphKWZOV.js")) }), `./translations/${locale}.json`, 3);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  }
};
exports.PLUGIN_ID = PLUGIN_ID;
exports.index = index;
