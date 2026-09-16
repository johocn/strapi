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
    operationModeAliases: {
        开放式净值型: string;
        封闭式: string;
        定期开放: string;
    };
    scoreScales: {
        returnScale: number;
        volatilityScale: number;
        drawdownScale: number;
        volatilityScaleByType: {
            'bank-wealth': number;
            'money-fund': number;
            'money-wealth': number;
        };
        drawdownScaleByType: {
            'bank-wealth': number;
        };
        returnScaleByType: {
            'money-fund': number;
            'money-wealth': number;
            'bank-wealth': number;
            'bond-fund': number;
            'mixed-fund': number;
            'stock-fund': number;
        };
    };
    starThresholds: Record<string, number>;
};
export default _default;
