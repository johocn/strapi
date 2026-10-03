export interface AnalyticsError {
    code: string;
    message: string;
    retry?: boolean;
    maxRetries?: number;
}
export declare const AnalyticsErrors: {
    INVALID_DATA: {
        code: string;
        message: string;
    };
    MISSING_SESSION: {
        code: string;
        message: string;
    };
    INVALID_AD_SLOT: {
        code: string;
        message: string;
    };
    INVALID_ARTICLE: {
        code: string;
        message: string;
    };
    IP_PARSE_ERROR: {
        code: string;
        message: string;
    };
    AGGREGATION_ERROR: {
        code: string;
        message: string;
        retry: boolean;
        maxRetries: number;
    };
};
export declare function identifyAnalyticsError(error: any): AnalyticsError;
//# sourceMappingURL=analyticsErrors.d.ts.map