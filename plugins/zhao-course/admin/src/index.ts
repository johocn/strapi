import { PLUGIN_ID } from "./pluginId";
import { Initializer } from "./components/Initializer";
import { PluginIcon } from "./components/PluginIcon";

const FEATURE_FLAGS_CUSTOM_FIELD = {
  name: "featureFlags",
  pluginId: PLUGIN_ID,
  type: "json" as const,
  intlLabel: {
    id: `${PLUGIN_ID}.featureFlags.label`,
    defaultMessage: "播放功能开关",
  },
  intlDescription: {
    id: `${PLUGIN_ID}.featureFlags.description`,
    defaultMessage: "课程播放功能开关（倍速/横竖屏/锁定/画中画/自动连播/进度控制）",
  },
  icon: PluginIcon,
  components: {
    Input: async () =>
      import("./components/FeatureFlagsInput").then((mod) => ({ default: mod.default })),
  },
  options: {},
};

export default {
  register(app: any) {
    if (app.customFields && typeof app.customFields.register === "function") {
      app.customFields.register(FEATURE_FLAGS_CUSTOM_FIELD);
    }

    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: "课程管理",
      },
      Component: () => import("./pages/App").then((mod) => ({ default: mod.App })),
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: "课程管理",
      initializer: Initializer,
      isReady: false,
    });
  },

  bootstrap(app: any) {
    // 引导逻辑
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);
          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};
