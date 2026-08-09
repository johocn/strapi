import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export { pluginId };
export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '官网管理',
      },
      permissions: [
        {
          action: 'plugin::zhao-website.read',
          subject: null,
        },
      ],
      Component: () => import('./pages/App').then((mod) => ({ default: mod.default })),
    });
    app.registerPlugin({
      id: pluginId,
      name: '官网管理',
    });
  },
  bootstrap(app: any) {},
};
