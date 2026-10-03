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
declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    calculateQuality(content: any): QualityScore;
    isQualityAcceptable(score: QualityScore): boolean;
    getQualityLevel(score: QualityScore): "high" | "medium" | "low";
};
export default _default;
//# sourceMappingURL=quality.d.ts.map