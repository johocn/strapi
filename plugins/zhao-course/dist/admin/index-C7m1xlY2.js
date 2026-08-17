"use strict";
const jsxRuntime = require("react/jsx-runtime");
const react = require("react");
const icons = require("@strapi/icons");
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
const strapi = { "name": "zhao-course" };
const pluginPkg = {
  strapi
};
const PLUGIN_ID = pluginPkg.strapi.name;
const Initializer = ({ setPlugin }) => {
  const [isLoading, setIsLoading] = react.useState(true);
  react.useEffect(() => {
    setPlugin("zhao-course");
    setIsLoading(false);
  }, [setPlugin]);
  return isLoading ? /* @__PURE__ */ jsxRuntime.jsx("p", { children: "Loading..." }) : null;
};
const PluginIcon = () => /* @__PURE__ */ jsxRuntime.jsx(icons.Lightbulb, {});
const FEATURE_FLAGS_CUSTOM_FIELD = {
  name: "featureFlags",
  pluginId: PLUGIN_ID,
  type: "json",
  intlLabel: {
    id: `${PLUGIN_ID}.featureFlags.label`,
    defaultMessage: "播放功能开关"
  },
  intlDescription: {
    id: `${PLUGIN_ID}.featureFlags.description`,
    defaultMessage: "课程播放功能开关（倍速/横竖屏/锁定/画中画/自动连播/进度控制）"
  },
  icon: PluginIcon,
  components: {
    Input: async () => Promise.resolve().then(() => require("./FeatureFlagsInput-BQjwf9rw.js")).then((mod) => ({ default: mod.default }))
  },
  options: {}
};
const index = {
  register(app) {
    if (app.customFields && typeof app.customFields.register === "function") {
      app.customFields.register(FEATURE_FLAGS_CUSTOM_FIELD);
    }
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "课程管理"
      },
      Component: () => Promise.resolve().then(() => require("./App-mhsDDJg_.js")).then((mod) => ({ default: mod.App }))
    });
    app.registerPlugin({
      id: PLUGIN_ID,
      name: "课程管理",
      initializer: Initializer,
      isReady: false
    });
  },
  bootstrap(app) {
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => Promise.resolve().then(() => require("./en-D28F7CM4.js")), "./translations/zh-Hans.json": () => Promise.resolve().then(() => require("./zh-Hans-DqGq8Paa.js")) }), `./translations/${locale}.json`, 3);
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
