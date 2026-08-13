import { Core } from '@strapi/strapi';
interface ScoreBreakdown {
    compositeScore: number;
    starRating: number;
    returnScore: number;
    volatilityScore: number;
    drawdownScore: number;
    peerRankScore: number;
    weightProfile: string;
    period: string;
}
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    calculateScore: (productId: number, period: string) => Promise<ScoreBreakdown | null>;
    calculateAndSaveScoreSnapshot: (productId: number, snapshotDate: string, period: string) => Promise<void>;
    getScoreLeaderboard: (params: {
        productType?: string;
        operationMode?: string;
        period?: string;
        riskLevel?: string;
        page?: number;
        pageSize?: number;
    }) => Promise<{
        records: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getScoreBreakdown: (productId: number, period: string) => Promise<ScoreBreakdown | null>;
    recalculateAllScores: (period?: string) => Promise<{
        total: number;
        success: number;
        failed: number;
    }>;
};
export default _default;
