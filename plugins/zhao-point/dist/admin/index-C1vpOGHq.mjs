import { jsx } from "react/jsx-runtime";
import { PuzzlePiece } from "@strapi/icons";
import { useRef, useEffect } from "react";
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
const PluginIcon = () => /* @__PURE__ */ jsx(PuzzlePiece, {});
const strapi = { "name": "zhao-point" };
const pluginPkg = {
  strapi
};
const PLUGIN_ID = pluginPkg.strapi.name;
const Initializer = ({ setPlugin }) => {
  const ref = useRef(setPlugin);
  useEffect(() => {
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
        const { App } = await import("./App-BLsdH4wk.mjs");
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
          const { default: data } = await __variableDynamicImportRuntimeHelper(/* @__PURE__ */ Object.assign({ "./translations/en.json": () => import("./en-CrBakvUa.mjs"), "./translations/zh-Hans.json": () => import("./zh-Hans-5HScj7GB.mjs") }), `./translations/${locale}.json`, 3);
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
