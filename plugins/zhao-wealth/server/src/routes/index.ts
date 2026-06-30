'use strict';

import contentApi from './content-api';
import adminApi from './admin-api';

export default {
  'content-api': {
    type: 'content-api',
    routes: contentApi.routes,
  },
  'admin-api': {
    type: 'admin',
    routes: adminApi.routes,
  },
};