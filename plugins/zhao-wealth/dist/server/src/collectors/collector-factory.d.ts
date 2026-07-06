import { default as ChinawealthCollector } from './chinawealth-collector';
/**
 * 根据数据源标识获取采集器实例
 */
export declare function getCollector(source: string): any;
/**
 * 获取中国理财网采集器（固定）
 */
export declare function getChinawealthCollector(): ChinawealthCollector;
/**
 * 获取所有可用的数据源选项
 */
export declare function getAvailableSources(): Array<{
    value: string;
    label: string;
}>;
