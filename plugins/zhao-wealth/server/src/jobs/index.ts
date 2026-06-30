'use strict';

import { setupQueues } from './queue-setup';
import { registerCollectJobs } from './collect-job';
import { registerCalculateJobs } from './calculate-job';
import { registerRiskMetricJobs } from './risk-metric-job';

export default async ({ strapi }) => {
  await setupQueues(strapi);
  registerCollectJobs(strapi);
  registerCalculateJobs(strapi);
  registerRiskMetricJobs(strapi);
};
