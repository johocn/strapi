import { default as BaseCollector } from './base-collector';
export default class CbhbCollector extends BaseCollector {
    /**
     * 通过销售编码采集渤银理财产品详情
     * 页面结构为纯文本展示，不依赖 CSS class，通过文本内容匹配提取字段
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 从列表页搜索产品
     * 列表页也包含登记编码、销售编码等关键信息
     */
    private collectFromListPage;
    /**
     * 采集净值数据（占位，当前不实现）
     */
    collectNavData(productCode: string): Promise<any[]>;
    private parseRiskLevel;
    private parseTermType;
}
