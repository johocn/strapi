'use strict';

import CbhbCollector from './cbhb-collector';
import ChinawealthCollector from './chinawealth-collector';
import HzbankCollector from './hzbank-collector';
import NanyinCollector from './nanyin-collector';
import NingyinCollector from './ningyin-collector';
import QingdaoCollector from './qingdao-collector';

const COLLECTOR_MAP: Record<string, any> = {
  'cbhb': CbhbCollector,
  '渤银理财': CbhbCollector,
  'hzbank': HzbankCollector,
  '杭银理财': HzbankCollector,
  'qdccb': QingdaoCollector,
  '青岛银行': QingdaoCollector,
  'chinawealth': ChinawealthCollector,
  '中国理财网': ChinawealthCollector,
  'nanyin': NanyinCollector,
  '南银理财': NanyinCollector,
  'ningyin': NingyinCollector,
  '宁银理财': NingyinCollector,
  // 后续扩展：'工银理财': IcbcCollector, ...
};

/**
 * 根据数据源标识获取采集器实例
 */
export function getCollector(source: string) {
  const Cls = COLLECTOR_MAP[source];
  return Cls ? new Cls() : null;
}

/**
 * 获取中国理财网采集器（固定）
 */
export function getChinawealthCollector(): ChinawealthCollector {
  return new ChinawealthCollector();
}

/**
 * 获取所有可用的数据源选项
 */
export function getAvailableSources(): Array<{ value: string; label: string }> {
  return [
    { value: 'cbhb', label: '渤银理财' },
    { value: 'hzbank', label: '杭银理财' },
    { value: 'qdccb', label: '青岛银行' },
    { value: 'chinawealth', label: '中国理财网' },
    { value: 'nanyin', label: '南银理财' },
    { value: 'ningyin', label: '宁银理财' },
    // 后续扩展
  ];
}
