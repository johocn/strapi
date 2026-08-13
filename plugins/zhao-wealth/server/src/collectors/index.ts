'use strict';

import BaseCollector from './base-collector';
import CbhbCollector from './cbhb-collector';
import ChinawealthCollector from './chinawealth-collector';
import HzbankCollector from './hzbank-collector';

export { getCollector, getChinawealthCollector, getAvailableSources } from './collector-factory';

export default {
  'base-collector': BaseCollector,
  'cbhb-collector': CbhbCollector,
  'chinawealth-collector': ChinawealthCollector,
  'hzbank-collector': HzbankCollector,
};
