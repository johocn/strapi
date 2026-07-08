import { default as React } from 'react';
interface OverviewCardProps {
    title: string;
    value: number | string;
    suffix?: string;
}
declare const OverviewCard: React.FC<OverviewCardProps>;
export default OverviewCard;
