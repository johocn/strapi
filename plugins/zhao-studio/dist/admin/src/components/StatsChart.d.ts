import { default as React } from 'react';
interface ChartData {
    date: string;
    value: number;
}
interface StatsChartProps {
    data: ChartData[];
    type?: 'line' | 'bar';
    height?: number;
    loading?: boolean;
    title?: string;
}
declare const StatsChart: React.FC<StatsChartProps>;
export default StatsChart;
//# sourceMappingURL=StatsChart.d.ts.map