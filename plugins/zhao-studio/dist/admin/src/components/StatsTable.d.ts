import { default as React } from 'react';
interface StatsTableRow {
    key: string;
    name: string;
    value: number;
    change?: number;
    unit?: string;
}
interface StatsTableProps {
    data: StatsTableRow[];
    loading?: boolean;
    title?: string;
}
declare const StatsTable: React.FC<StatsTableProps>;
export default StatsTable;
//# sourceMappingURL=StatsTable.d.ts.map