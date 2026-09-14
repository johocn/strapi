declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 净值监察列表：每产品实时推导最新净值/年化/风险指标 + 双维度状态
     */
    getProductMonitorList(): Promise<{
        list: any[];
        summary: {
            ok: number;
            warning: number;
            danger: number;
        };
    }>;
    buildProductMonitor(product: any): Promise<{
        id: any;
        productName: any;
        productCode: any;
        companyName: any;
        latestNav: {
            navDate: any;
            unitNav: any;
            accNav: any;
            dataSource: any;
        };
        latestSnapshot: {
            snapshotDate: any;
            annual1m: any;
            annual3m: any;
            annual6m: any;
            annual1y: any;
        };
        latestMetrics: any;
        navStatus: string;
        navDaysBehind: number;
        annualStatus: string;
        riskStatus: string;
        overall: string;
    }>;
    /**
     * 净值新鲜度：距今天数 > 7 danger，> 3 warning，否则 ok
     */
    judgeNavStatus(latestNav: any): {
        status: string;
        daysBehind: number;
    };
    /**
     * 同步度：dataDate 为空 → danger；dataDate < navDate → warning；否则 ok
     */
    judgeSyncStatus(dataDate: string | null, navDate: string | null): "warning" | "ok" | "danger";
};
export default _default;
