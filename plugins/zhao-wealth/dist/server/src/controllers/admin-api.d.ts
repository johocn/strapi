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
    customerProductsList(ctx: any): Promise<void>;
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
};
export default _default;
