declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    companiesList(ctx: any): Promise<void>;
    companyDetail(ctx: any): Promise<void>;
    companyCreate(ctx: any): Promise<void>;
    companyUpdate(ctx: any): Promise<void>;
    companyDelete(ctx: any): Promise<void>;
    productsList(ctx: any): Promise<void>;
    productDetail(ctx: any): Promise<void>;
    productCreate(ctx: any): Promise<void>;
    productUpdate(ctx: any): Promise<void>;
    productDelete(ctx: any): Promise<void>;
    collectConfigsList(ctx: any): Promise<void>;
    collectConfigUpdate(ctx: any): Promise<void>;
    navDataList(ctx: any): Promise<void>;
    navDataCreate(ctx: any): Promise<void>;
    navDataUpdate(ctx: any): Promise<void>;
    recommendConfigsList(ctx: any): Promise<void>;
    recommendConfigCreate(ctx: any): Promise<void>;
    recommendConfigUpdate(ctx: any): Promise<void>;
    recommendConfigDelete(ctx: any): Promise<void>;
    stats(ctx: any): Promise<void>;
    statsOverview(ctx: any): Promise<void>;
    statsAnomalies(ctx: any): Promise<void>;
    collect(ctx: any): Promise<void>;
    collectConfirm(ctx: any): Promise<void>;
    /**
     * 对比双源数据，返回差异列表
     */
    compareData(sourceData: any, officialData: any): {
        status: string;
        matchScore: number;
        differences: {
            field: string;
            sourceValue: string;
            officialValue: string;
            severity: "info" | "warning" | "error";
            description: string;
        }[];
    };
    /**
     * 合并双源数据：以中国理财网数据为主，渤银数据补充缺失字段
     * 理财网字段：productName, registerCode, riskLevel, termType, productType,
     *            companyName, productStatus, operationMode, unitNav, navDate
     * 新策略：官网优先，理财网补充
     * - productCode: 销售编号（官网）
     * - productName: 官网名称
     * - productNameCw: 理财网名称
     * - saleCode: 官网销售编码（同 productCode）
     * - registerCode: 理财网登记编码（Z开头）
     * - 其他字段: 官网优先，回退理财网
     */
    mergeProductData(sourceData: any, officialData: any): any;
};
export default _default;
