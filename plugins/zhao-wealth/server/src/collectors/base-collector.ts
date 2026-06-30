'use strict';

export default class BaseCollector {
  /**
   * 采集产品基本信息
   */
  async collectProductInfo(productCode: string): Promise<any> {
    throw new Error('Method not implemented');
  }

  /**
   * 采集净值数据
   */
  async collectNavData(productCode: string): Promise<any[]> {
    throw new Error('Method not implemented');
  }

  /**
   * 数据入库
   */
  async saveToDatabase(productId: number, data: any): Promise<void> {
    throw new Error('Method not implemented');
  }
}