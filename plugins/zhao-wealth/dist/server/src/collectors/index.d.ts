import { default as BaseCollector } from './base-collector';
import { default as CbhbCollector } from './cbhb-collector';
import { default as ChinawealthCollector } from './chinawealth-collector';
import { default as HzbankCollector } from './hzbank-collector';
import { default as QingdaoCollector } from './qingdao-collector';
export { getCollector, getChinawealthCollector, getAvailableSources } from './collector-factory';
declare const _default: {
    'base-collector': typeof BaseCollector;
    'cbhb-collector': typeof CbhbCollector;
    'chinawealth-collector': typeof ChinawealthCollector;
    'hzbank-collector': typeof HzbankCollector;
    'qingdao-collector': typeof QingdaoCollector;
};
export default _default;
