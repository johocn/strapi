declare const _default: {
    product: ({ strapi }: {
        strapi: any;
    }) => {
        findList(filters: any, page?: number, pageSize?: number): Promise<{
            list: any;
            page: number;
            pageSize: number;
            total: any;
        }>;
        findOne(id: number): Promise<any>;
        create(data: any): Promise<any>;
        update(id: number, data: any): Promise<any>;
        delete(id: number): Promise<any>;
    };
    'nav-calculator': ({ strapi }: {
        strapi: any;
    }) => {
        calculateSnapshot(productId: number, snapshotDate: Date): Promise<any>;
        calculateNavSnapshot(productId: number, snapshotDate: Date): Promise<any>;
        calculateMoneyFundSnapshot(productId: number, snapshotDate: Date): Promise<any>;
        recalculateSnapshots(productId: number, startDate: Date, endDate: Date): Promise<void>;
        recalculateAll(): Promise<void>;
    };
    'annual-snapshot': ({ strapi }: {
        strapi: any;
    }) => {
        getSnapshotTimeSeries(productId: number, startDate: Date, endDate: Date, page: number, pageSize: number): Promise<{
            list: any;
            page: number;
            pageSize: number;
            total: any;
        }>;
        getYearlyReturns(productId: number): Promise<any>;
        calculateYearlyReturn(productId: number, year: number): Promise<any>;
    };
    'recommend-service': ({ strapi }: {
        strapi: any;
    }) => {
        getRecommendations(userId: number, channelId: number, limit?: number): Promise<any[]>;
    };
    'customer-product': ({ strapi }: {
        strapi: any;
    }) => {
        getUserProducts(userId: number, page: number, pageSize: number): Promise<{
            list: any[];
            page: number;
            pageSize: number;
            total: any;
        }>;
        addProduct(userId: number, productId: number, channelId: number): Promise<any>;
        removeProduct(userId: number, customerProductId: number): Promise<any>;
        getChannelProductsStats(channelId: number): Promise<{
            productId: number;
            productName: string;
            followCount: number;
        }[]>;
    };
    'risk-metric-service': ({ strapi }: {
        strapi: any;
    }) => {
        calculateMetricsForPeriod(productId: number, snapshotDate: Date, period: string): Promise<{
            volatility: number | null;
            maxDrawdown: number | null;
            sharpe: number | null;
            annualReturn: number | null;
        }>;
        calculateRankPercentile(productId: number, snapshotDate: Date, period: string): Promise<number | null>;
        calculateAndSaveMetrics(productId: number, snapshotDate: Date): Promise<void>;
        calculateAllForDate(snapshotDate: Date): Promise<void>;
        recalculateAll(): Promise<void>;
        adminAggregate(productId: number, period: string): Promise<Record<string, number>>;
        adminTrend(productId: number): Promise<Record<string, {
            snapshotDate: string;
            period: string;
            volatility: number | null;
            maxDrawdown: number | null;
            sharpe: number | null;
            rankPercentile: number | null;
        }[]>>;
        adminPeers(period: string, metricName: string, limit?: number): Promise<any>;
    };
    stats: ({ strapi }: {
        strapi: any;
    }) => {
        getOverview(): Promise<{
            productCount: any;
            companyCount: any;
            collectSuccessRate: number;
            riskMetricCoverage: number;
            todayAnomaly: any;
        }>;
        getAnomalies(limit?: number): Promise<any[]>;
    };
};
export default _default;
