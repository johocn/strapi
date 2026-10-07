export interface VariantReportRow {
    variantId: string;
    variantName: string;
    campaignCode: string;
    campaignName: string;
    weight?: number;
    impressions: number;
    clicks: number;
    ctr: number;
    orders: number;
    matchedCommission: number;
}
export interface ChannelReportData {
    channel: {
        code: string;
        name: string;
        scene?: string;
    };
    groupBy: string;
    byVariant?: VariantReportRow[];
    funnel?: Record<string, number>;
    revenue?: Record<string, number>;
    roi?: number;
    byCampaign?: Array<Record<string, any>>;
}
export declare const promoApi: {
    /** 渠道列表（下拉选择用） */
    listChannels(): Promise<Array<{
        documentId: string;
        code: string;
        name: string;
        scene?: string;
    }>>;
    /** 渠道报表：groupBy = variant | day | campaign */
    getChannelReport(params: {
        channelCode: string;
        startDate: string;
        endDate: string;
        groupBy: "variant" | "day" | "campaign";
    }): Promise<ChannelReportData>;
};
//# sourceMappingURL=promoApi.d.ts.map