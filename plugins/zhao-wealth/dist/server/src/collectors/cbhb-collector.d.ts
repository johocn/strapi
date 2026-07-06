import { default as BaseCollector } from './base-collector';
export default class CbhbCollector extends BaseCollector {
    /**
     * 通过销售编码采集渤银理财产品详情
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 从列表页搜索产品
     */
    private collectFromListPage;
    /**
     * 采集净值数据（占位，当前不实现）
     */
    collectNavData(productCode: string): Promise<any[]>;
    private parseRiskLevel;
    private parseTermType;
}
