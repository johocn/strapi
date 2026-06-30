'use strict';

import product from './product';
import navCalculator from './nav-calculator';
import annualSnapshot from './annual-snapshot';
import recommendService from './recommend-service';
import customerProduct from './customer-product';
import riskMetricService from './risk-metric-service';

export default {
  product,
  'nav-calculator': navCalculator,
  'annual-snapshot': annualSnapshot,
  'recommend-service': recommendService,
  'customer-product': customerProduct,
  'risk-metric-service': riskMetricService,
};
