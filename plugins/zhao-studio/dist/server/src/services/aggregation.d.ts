import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    aggregateArticleDaily(date: Date): Promise<void>;
    aggregateAdSlotDaily(date: Date): Promise<void>;
    aggregateGlobalDaily(date: Date): Promise<void>;
    aggregateDeviceDaily(date: Date): Promise<void>;
    aggregateRegionDaily(date: Date): Promise<void>;
    runDailyAggregation(): Promise<{
        success: boolean;
        date: Date;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        date: Date;
    }>;
};
export default _default;
//# sourceMappingURL=aggregation.d.ts.map