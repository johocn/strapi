export interface PublishError {
    code: string;
    message: string;
    platform?: string;
    accountId?: string;
}
export declare const PublishErrors: {
    ARTICLE_NOT_READY: {
        code: string;
        message: string;
    };
    ACCOUNT_NOT_FOUND: {
        code: string;
        message: string;
    };
    PLATFORM_NOT_SUPPORTED: {
        code: string;
        message: string;
    };
    API_ERROR: {
        code: string;
        message: string;
    };
    AUTH_ERROR: {
        code: string;
        message: string;
    };
    CONTENT_TOO_LONG: {
        code: string;
        message: string;
    };
    IMAGE_ERROR: {
        code: string;
        message: string;
    };
    NETWORK_ERROR: {
        code: string;
        message: string;
    };
};
export declare function identifyPublishError(error: any, platform?: string): PublishError;
//# sourceMappingURL=publishErrors.d.ts.map