'use strict';

import BaseCollector from './base-collector';
import CbhbCollector from './cbhb-collector';

export default {
  'base-collector': BaseCollector,
  'cbhb-collector': CbhbCollector,
};

export function getCollector(collectMethod: string): BaseCollector {
  switch (collectMethod) {
    case 'web-crawler':
      return new CbhbCollector();
    default:
      return new BaseCollector();
  }
}