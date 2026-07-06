type StatsType = 'basic' | 'advanced' | 'pro';
interface UseStatsParams {
    type: StatsType;
}
interface StatsRow {
    key: string;
    name: string;
    value: number;
    change?: number;
    unit?: string;
}
interface ChartData {
    date: string;
    value: number;
}
export declare const useStats: ({ type }: UseStatsParams) => {
    stats: StatsRow[];
    chartData: ChartData[];
    loading: boolean;
};
export default useStats;
//# sourceMappingURL=useStats.d.ts.map