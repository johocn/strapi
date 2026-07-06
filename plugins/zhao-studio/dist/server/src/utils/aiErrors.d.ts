export interface AIError {
    code: string;
    message: string;
    fallback: string;
}
export declare const AIErrors: {
    API_ERROR: {
        code: string;
        message: string;
        fallback: string;
    };
    TOKEN_ERROR: {
        code: string;
        message: string;
        fallback: string;
    };
    RESPONSE_ERROR: {
        code: string;
        message: string;
        fallback: string;
    };
    CONFIG_ERROR: {
        code: string;
        message: string;
        fallback: string;
    };
};
export declare function identifyAIErrorType(error: any): AIError;
//# sourceMappingURL=aiErrors.d.ts.map