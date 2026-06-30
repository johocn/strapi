'use strict';

import wealthCompany from './wealth-company/schema.json';
import wealthProduct from './wealth-product/schema.json';
import wealthCollectConfig from './wealth-collect-config/schema.json';
import wealthNav from './wealth-nav/schema.json';
import wealthMoneyIncome from './wealth-money-income/schema.json';
import wealthAnnualSnapshot from './wealth-annual-snapshot/schema.json';
import wealthYearlyReturn from './wealth-yearly-return/schema.json';
import wealthCustomerProduct from './wealth-customer-product/schema.json';
import wealthRecommendConfig from './wealth-recommend-config/schema.json';
import wealthRiskMetric from './wealth-risk-metric/schema.json';

export default {
  'wealth-company': { schema: wealthCompany },
  'wealth-product': { schema: wealthProduct },
  'wealth-collect-config': { schema: wealthCollectConfig },
  'wealth-nav': { schema: wealthNav },
  'wealth-money-income': { schema: wealthMoneyIncome },
  'wealth-annual-snapshot': { schema: wealthAnnualSnapshot },
  'wealth-yearly-return': { schema: wealthYearlyReturn },
  'wealth-customer-product': { schema: wealthCustomerProduct },
  'wealth-recommend-config': { schema: wealthRecommendConfig },
  'wealth-risk-metric': { schema: wealthRiskMetric },
};
