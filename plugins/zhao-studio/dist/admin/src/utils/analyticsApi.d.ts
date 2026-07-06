export declare const analyticsApi: {
    listAdSlots(): Promise<any>;
    createAdSlot(data: any): Promise<any>;
    updateAdSlot(id: string, data: any): Promise<any>;
    deleteAdSlot(id: string): Promise<any>;
    toggleAdSlot(id: string, isActive: boolean): Promise<any>;
    getOverview(params: {
        startDate: string;
        endDate: string;
    }): Promise<any>;
    getArticleStats(params: {
        articleId?: string;
        startDate: string;
        endDate: string;
    }): Promise<any>;
    getAdSlotStats(params: {
        adSlotId?: string;
        startDate: string;
        endDate: string;
    }): Promise<any>;
    getDeviceStats(params: {
        startDate: string;
        endDate: string;
    }): Promise<any>;
    getRegionStats(params: {
        startDate: string;
        endDate: string;
    }): Promise<any>;
    getUserStats(params: {
        startDate: string;
        endDate: string;
    }): Promise<any>;
};
//# sourceMappingURL=analyticsApi.d.ts.map