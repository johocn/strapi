export default class BaseCollector {
    /**
     * 采集产品基本信息
     */
    collectProductInfo(productCode: string): Promise<any>;
    /**
     * 采集净值数据
     */
    collectNavData(productCode: string): Promise<any[]>;
    /**
     * 数据入库
     */
    saveToDatabase(productId: number, data: any): Promise<void>;
}
