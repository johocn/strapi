import { PluginIcon } from "./components/PluginIcon";
import { Initializer } from "./components/Initializer";

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/zhao-point`,
      icon: PluginIcon,
      intlLabel: {
        id: "zhao-point.plugin.name",
        defaultMessage: "积分管理",
      },
      Component: async () => {
        const { App } = await import("./pages/App");
        return App;
      },
    });

    app.registerPlugin({
      id: "zhao-point",
      initializer: Initializer,
      isReady: false,
      name: "积分管理",
    });
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
