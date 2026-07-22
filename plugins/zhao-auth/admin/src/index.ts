// admin/src/index.ts
import pluginId from './pluginId';
import { LockOutlined } from '@ant-design/icons';

const pluginDescription = '认证授权管理';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: LockOutlined,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: '认证授权',
      },
      permissions: [{ action: 'zhao-auth.user.manage', subject: null }],
      Component: async () => import('./pages/App'),
    });

    app.registerPlugin({
      id: pluginId,
      name: 'zhao-auth',
    });
  },

  bootstrap(app: any) {},
};
