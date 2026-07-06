export type RatingLevel = 'excellent' | 'good' | 'fair' | 'poor';
export interface RatingRule {
    level: RatingLevel;
    label: string;
    color: string;
}
export declare function rateVolatility(value: number | null): RatingRule;
export declare function rateMaxDrawdown(value: number | null): RatingRule;
export declare function rateSharpe(value: number | null): RatingRule;
export declare function rateRankPercentile(value: number | null): RatingRule;
export declare function formatPercent(value: number | null, digits?: number): string;
