import pluginId from './pluginId';
import { PluginIcon } from './components/PluginIcon';

export { pluginId };
export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
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
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
    });
    app.registerPlugin({
      id: pluginId,
      name: '官网管理',
    });
  },
  bootstrap(app: any) {},
};
