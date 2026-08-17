import { jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Lightbulb } from "@strapi/icons";
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
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    setPlugin("zhao-course");
    setIsLoading(false);
  }, [setPlugin]);
  return isLoading ? /* @__PURE__ */ jsx("p", { children: "Loading..." }) : null;
};
const PluginIcon = () => /* @__PURE__ */ jsx(Lightbulb, {});
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
    Input: async () => import("./FeatureFlagsInput-CwO0c4s-.mjs").then((mod) => ({ default: mod.default }))
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
      Component: () => import("./App-Djldr5l9.mjs").then((mod) => ({ default: mod.App }))
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
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => import("./en-CuBY3d_y.mjs"), "./translations/zh-Hans.json": () => import("./zh-Hans-B-f7k3jR.mjs") }), `./translations/${locale}.json`, 3);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  }
};
export {
  PLUGIN_ID as P,
  index as i
};
