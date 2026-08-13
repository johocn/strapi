'use strict';

import product from './product';
import navCalculator from './nav-calculator';
import annualSnapshot from './annual-snapshot';
import recommendService from './recommend-service';
import riskMetricService from './risk-metric-service';
import statsService from './stats-service';
import disclosureService from './disclosure-service';
import compareService from './compare-service';
import scoringService from './scoring-service';
import portfolioService from './portfolio-service';
import consultationService from './consultation-service';
import riskDisclosureService from './risk-disclosure-service';

export default {
  product,
  'nav-calculator': navCalculator,
  'annual-snapshot': annualSnapshot,
  'recommend-service': recommendService,
  'risk-metric-service': riskMetricService,
  stats: statsService,
  'disclosure-service': disclosureService,
  'compare-service': compareService,
  'scoring-service': scoringService,
  'portfolio-service': portfolioService,
  'consultation-service': consultationService,
  'risk-disclosure-service': riskDisclosureService,
};
