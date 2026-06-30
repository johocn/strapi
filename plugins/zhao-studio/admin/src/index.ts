import pluginId from './pluginId';
import { Information } from '@strapi/icons';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: Information,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '内容工作室',
      },
      permissions: [
        {
          action: 'plugin::zhao-studio.read',
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
      name: '内容工作室',
    });
  },
  bootstrap(app: any) {
    // Bootstrap logic
  },
};