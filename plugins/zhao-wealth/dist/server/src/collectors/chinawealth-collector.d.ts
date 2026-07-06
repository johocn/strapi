import { default as BaseCollector } from './base-collector';
export default class ChinawealthCollector extends BaseCollector {
    /**
     * 通过登记编码查询中国理财网
     */
    collectByRegisterCode(registerCode: string): Promise<any>;
    /**
     * 采集产品信息（兼容 BaseCollector 接口）
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据（占位）
     */
    collectNavData(productCode: string): Promise<any[]>;
    private parseRiskLevel;
    private parseTermType;
    private parseProductType;
}
