import { Core } from '../../../../../../node_modules/@strapi/strapi';
import { OAuthState } from './types';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    getAuthorizeUrl(accountId: string): Promise<string>;
    handleCallback(platformType: string, code: string, state: string): Promise<{
        accountId: string;
        oauthState: OAuthState;
    }>;
    ensureValidToken(accountId: string): Promise<string>;
    batchRefreshExpiringTokens(): Promise<{
        refreshed: number;
        failed: number;
    }>;
    revokeAuthorization(accountId: string): Promise<void>;
    getStatus(accountId: string): Promise<{
        accountId: string;
        accountName: any;
        platformType: any;
        oauthState: any;
        oauthExpiresAt: any;
        oauthOpenId: any;
        lastRefreshAt: any;
    }>;
};
export default _default;
//# sourceMappingURL=oauth-manager.d.ts.map