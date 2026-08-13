declare const _default: {
    riskFreeRate: number;
    riskMetricPeriods: readonly ["m1", "m3", "m6", "y1"];
    riskMetricBatchConcurrency: number;
    scoreWeights: Record<string, {
        returns: number;
        volatility: number;
        drawdown: number;
        peerRank: number;
    }>;
    starThresholds: Record<string, number>;
};
export default _default;
