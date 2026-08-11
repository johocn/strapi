'use strict';

import product from './product';
import navCalculator from './nav-calculator';
import annualSnapshot from './annual-snapshot';
import recommendService from './recommend-service';
import customerProduct from './customer-product';
import riskMetricService from './risk-metric-service';
import statsService from './stats-service';
import disclosureService from './disclosure-service';
import holdingService from './holding-service';
import compareService from './compare-service';

export default {
  product,
  'nav-calculator': navCalculator,
  'annual-snapshot': annualSnapshot,
  'recommend-service': recommendService,
  'customer-product': customerProduct,
  'risk-metric-service': riskMetricService,
  stats: statsService,
  'disclosure-service': disclosureService,
  'holding-service': holdingService,
  'compare-service': compareService,
};
