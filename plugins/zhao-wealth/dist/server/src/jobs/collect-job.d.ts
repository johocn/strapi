/**
 * 按「日期+净值」双重条件保存净值：
 * - 日期不存在 → 插入（insertCount++）
 * - 日期存在且净值相同 → 跳过
 * - 日期存在但净值不同 → 更新净值字段（updateCount++），记录日期供联动删除指标
 * 货币型产品收益（万份收益/七日年化）按「产品+日期」upsert 到独立表，与净值判定解耦。
 * 返回 { insertCount, updateCount, updatedDates }
 */
export declare function processNavData(strapi: any, productId: number, navData: any[]): Promise<{
    insertCount: number;
    updateCount: number;
    updatedDates: string[];
}>;
export declare function registerCollectJobs(strapi: any): void;
