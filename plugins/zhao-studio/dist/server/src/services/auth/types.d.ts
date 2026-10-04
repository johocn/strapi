export interface IOAuthProvider {
    readonly platformType: string;
    readonly displayName: string;
    buildAuthorizeUrl(state: string, accountId: string): string;
    exchangeToken(code: string, accountId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        openId: string;
        scope: string;
        rawResponse: any;
    }>;
    refreshToken(refreshToken: string, accountId: string): Promise<{
        accessToken: string;
        refreshToken?: string;
        expiresAt: Date;
        rawResponse: any;
    }>;
}
export type OAuthState = 'unauthorized' | 'authorized' | 'expired' | 'revoked';
export declare const REDIS_NONCE_PREFIX = "zhao:studio:oauth:nonce:";
export declare const NONCE_TTL_SECONDS = 300;
//# sourceMappingURL=types.d.ts.map