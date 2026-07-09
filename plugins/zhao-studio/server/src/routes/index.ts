import adminRoutes from './admin';
import contentApiRoutes from './content-api';

export default {
  admin: {
    type: 'admin' as const,
    routes: adminRoutes().routes,
  },
  'content-api': {
    type: 'content-api' as const,
    routes: contentApiRoutes().routes,
  },
};
