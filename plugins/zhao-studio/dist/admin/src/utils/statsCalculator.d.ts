export interface StatsOverview {
    pv: number;
    uv: number;
    clickCount: number;
    clickRate: number;
    avgReadDuration: number;
    avgScrollDepth: number;
    pvChange: number;
    uvChange: number;
    clickChange: number;
}
export interface StatsItem {
    id: string;
    label: string;
    value: number;
    change?: number;
}
export interface DeviceStats {
    desktop: number;
    mobile: number;
    tablet: number;
}
export interface RegionStats {
    country: string;
    city?: string;
    count: number;
}
export interface ReferrerStats {
    domain: string;
    count: number;
}
export interface UserStats {
    total: number;
    registered: number;
    unregistered: number;
    registerRate: number;
}
export declare function calculateChange(current: number, previous: number): number;
export declare function formatNumber(num: number): string;
export declare function formatDuration(seconds: number): string;
export declare function formatPercent(value: number): string;
export declare function getDateRange(type: 'today' | 'yesterday' | 'week' | 'month'): {
    startDate: string;
    endDate: string;
};
export declare function aggregateByField(data: any[], field: string): {
    label: string;
    value: number;
}[];
export declare function getTopItems(data: {
    label: string;
    value: number;
}[], limit?: number): {
    label: string;
    value: number;
}[];
//# sourceMappingURL=statsCalculator.d.ts.map