'use strict';

import product from './product';
import nav from './nav';
import annual from './annual';
import recommend from './recommend';
import customerProduct from './customer-product';
import collect from './collect';
import adminApi from './admin-api';

export default {
  product,
  nav,
  annual,
  recommend,
  'customer-product': customerProduct,
  collect,
  'admin-api': adminApi,
};