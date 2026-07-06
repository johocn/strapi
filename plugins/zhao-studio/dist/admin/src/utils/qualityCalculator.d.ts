export interface QualityScore {
    total: number;
    details: {
        length: number;
        images: number;
        author: number;
        date: number;
        title: number;
    };
}
export declare function getQualityColor(score: number): string;
export declare function getQualityLabel(score: number): string;
export declare function isQualityAcceptable(score: number): boolean;
//# sourceMappingURL=qualityCalculator.d.ts.map