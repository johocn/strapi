// server/src/services/auth/types.ts

export interface IOAuthProvider {
  readonly platformType: string;
  readonly displayName: string;

  buildAuthorizeUrl(state: string, accountId: string): Promise<string>;

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

export const REDIS_NONCE_PREFIX = 'zhao:studio:oauth:nonce:';
export const NONCE_TTL_SECONDS = 300; // 5 分钟有效
