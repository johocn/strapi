export interface CollectError {
    code: string;
    message: string;
    retry: boolean;
    maxRetries?: number;
    warning?: boolean;
}
export declare const CollectErrors: {
    NETWORK_ERROR: {
        code: string;
        message: string;
        retry: boolean;
        maxRetries: number;
    };
    SELECTOR_ERROR: {
        code: string;
        message: string;
        retry: boolean;
    };
    CONTENT_ERROR: {
        code: string;
        message: string;
        retry: boolean;
        warning: boolean;
    };
    PERMISSION_ERROR: {
        code: string;
        message: string;
        retry: boolean;
    };
};
export declare function identifyErrorType(error: any): CollectError;
//# sourceMappingURL=errors.d.ts.map