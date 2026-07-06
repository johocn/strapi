import { default as BaseCollector } from './base-collector';
import { default as CbhbCollector } from './cbhb-collector';
declare const _default: {
    'base-collector': typeof BaseCollector;
    'cbhb-collector': typeof CbhbCollector;
};
export default _default;
export declare function getCollector(collectMethod: string): BaseCollector;
