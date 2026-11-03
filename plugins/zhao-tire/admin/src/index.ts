import pluginId from "./pluginId";
import { PluginIcon } from "./components/PluginIcon";

export { pluginId };

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "雪地胎寄存",
      },
      permissions: [
        {
          action: "plugin::zhao-tire.order.read",
          subject: null,
        },
      ],
      Component: () =>
        import("./pages/App").then((mod) => ({ default: mod.default })),
    });
    app.registerPlugin({
      id: pluginId,
      name: "雪地胎寄存",
    });
  },
  bootstrap(app: any) {},
};
