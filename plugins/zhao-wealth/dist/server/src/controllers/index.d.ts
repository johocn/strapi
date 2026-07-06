declare const _default: {
    product: ({ strapi }: {
        strapi: any;
    }) => {
        list(ctx: any): Promise<void>;
        detail(ctx: any): Promise<void>;
    };
    nav: ({ strapi }: {
        strapi: any;
    }) => {
        timeSeries(ctx: any): Promise<void>;
    };
    annual: ({ strapi }: {
        strapi: any;
    }) => {
        snapshotTimeSeries(ctx: any): Promise<void>;
        yearlyReturns(ctx: any): Promise<void>;
    };
    recommend: ({ strapi }: {
        strapi: any;
    }) => {
        list(ctx: any): Promise<void>;
    };
    'customer-product': ({ strapi }: {
        strapi: any;
    }) => {
        list(ctx: any): Promise<void>;
        add(ctx: any): Promise<void>;
        remove(ctx: any): Promise<void>;
    };
    collect: ({ strapi }: {
        strapi: any;
    }) => {
        trigger(ctx: any): Promise<void>;
        status(ctx: any): Promise<void>;
        recalculate(ctx: any): Promise<void>;
    };
    'admin-api': ({ strapi }: {
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
    'risk-metric': ({ strapi }: {
        strapi: any;
    }) => {
        getMetrics(ctx: any): Promise<void>;
        recalculate(ctx: any): Promise<void>;
        adminAggregate(ctx: any): Promise<void>;
        adminTrend(ctx: any): Promise<void>;
        adminPeers(ctx: any): Promise<void>;
    };
};
export default _default;
