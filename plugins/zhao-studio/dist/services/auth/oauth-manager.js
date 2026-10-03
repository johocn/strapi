"use strict";
// server/src/services/auth/oauth-manager.ts
Object.defineProperty(exports, "__esModule", { value: true });
const providers_1 = require("./providers");
const utils_1 = require("./utils");
const ACCOUNT_UID = 'plugin::zhao-studio.publish-account';
exports.default = ({ strapi }) => ({
    async getAuthorizeUrl(accountId) {
        const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
        if (!account)
            throw new Error('账号不存在');
        const platformType = account.platform?.type;
        if (!platformType)
            throw new Error('账号未关联平台');
        const skipOAuth = ['internal', 'custom'].includes(platformType);
        if (skipOAuth)
            throw new Error(`平台 ${platformType} 不需要 OAuth 授权`);
        const provider = (0, providers_1.getProvider)(strapi, platformType);
        if (!provider)
            throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);
        const nonce = (0, utils_1.generateNonce)();
        const state = (0, utils_1.encodeState)(accountId, nonce);
        await (0, utils_1.validateAndConsumeNonce)(strapi, nonce);
        return provider.buildAuthorizeUrl(state);
    },
    async handleCallback(platformType, code, state) {
        const parsed = (0, utils_1.decodeState)(state);
        if (!parsed)
            throw new Error('state 参数格式无效');
        const nonceOk = await (0, utils_1.validateAndConsumeNonce)(strapi, parsed.nonce);
        if (!nonceOk)
            throw new Error('OAuth state 校验失败（nonce 已使用）');
        const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: parsed.accountId, populate: { platform: true } });
        if (!account)
            throw new Error('账号不存在');
        if (account.platform?.type !== platformType)
            throw new Error('平台类型不匹配');
        const provider = (0, providers_1.getProvider)(strapi, platformType);
        if (!provider)
            throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);
        const tokenResult = await provider.exchangeToken(code);
        await strapi.documents(ACCOUNT_UID).update({
            documentId: parsed.accountId,
            data: {
                oauthAccessToken: tokenResult.accessToken,
                oauthRefreshToken: tokenResult.refreshToken,
                oauthExpiresAt: tokenResult.expiresAt,
                oauthOpenId: tokenResult.openId,
                oauthScope: tokenResult.scope,
                oauthState: 'authorized',
                lastRefreshAt: new Date(),
            },
        });
        strapi.log.info(`[zhao-studio] OAuth 授权成功 account=${parsed.accountId} platform=${platformType} openId=${tokenResult.openId}`);
        return { accountId: parsed.accountId, oauthState: 'authorized' };
    },
    async ensureValidToken(accountId) {
        const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
        if (!account)
            throw new Error('账号不存在');
        const platformType = account.platform?.type;
        const skipOAuth = ['internal', 'custom'].includes(platformType);
        if (skipOAuth) {
            const apiKey = account.config?.apiKey;
            if (!apiKey)
                throw new Error(`${platformType} 平台未配置 apiKey`);
            return apiKey;
        }
        if (account.oauthState !== 'authorized') {
            throw new Error('账号未完成 OAuth 授权（oauthState=' + account.oauthState + '）');
        }
        const expiresAt = account.oauthExpiresAt ? new Date(account.oauthExpiresAt).getTime() : 0;
        if (expiresAt > Date.now() + 5 * 60 * 1000) {
            return account.oauthAccessToken;
        }
        strapi.log.info(`[zhao-studio] OAuth token 即将过期，自动续期 account=${accountId}`);
        const provider = (0, providers_1.getProvider)(strapi, platformType);
        if (!provider)
            throw new Error(`暂不支持的 OAuth 平台: ${platformType}`);
        const refreshResult = await provider.refreshToken(account.oauthRefreshToken);
        await strapi.documents(ACCOUNT_UID).update({
            documentId: accountId,
            data: {
                oauthAccessToken: refreshResult.accessToken,
                oauthRefreshToken: refreshResult.refreshToken || account.oauthRefreshToken,
                oauthExpiresAt: refreshResult.expiresAt,
                oauthState: 'authorized',
                lastRefreshAt: new Date(),
            },
        });
        return refreshResult.accessToken;
    },
    async batchRefreshExpiringTokens() {
        const now = new Date();
        const soon = new Date(now.getTime() + 10 * 60 * 1000);
        const accounts = await strapi.documents(ACCOUNT_UID).findMany({
            filters: {
                oauthExpiresAt: { $lt: soon },
                oauthState: 'authorized',
                isActive: true,
            },
            populate: { platform: true },
        });
        let refreshed = 0;
        let failed = 0;
        for (const account of accounts) {
            try {
                await this.ensureValidToken(account.documentId);
                refreshed++;
            }
            catch (err) {
                strapi.log.error(`[zhao-studio] OAuth 批量续期失败 account=${account.documentId}: ${err.message}`);
                await strapi.documents(ACCOUNT_UID).update({
                    documentId: account.documentId,
                    data: { oauthState: 'expired' },
                });
                failed++;
            }
        }
        strapi.log.info(`[zhao-studio] OAuth 批量续期完成 refreshed=${refreshed} failed=${failed}`);
        return { refreshed, failed };
    },
    async revokeAuthorization(accountId) {
        await strapi.documents(ACCOUNT_UID).update({
            documentId: accountId,
            data: {
                oauthAccessToken: null,
                oauthRefreshToken: null,
                oauthExpiresAt: null,
                oauthOpenId: null,
                oauthScope: null,
                oauthState: 'revoked',
            },
        });
        strapi.log.info(`[zhao-studio] OAuth 授权已吊销 account=${accountId}`);
    },
    async getStatus(accountId) {
        const account = await strapi.documents(ACCOUNT_UID).findOne({ documentId: accountId, populate: { platform: true } });
        if (!account)
            throw new Error('账号不存在');
        return {
            accountId: account.documentId,
            accountName: account.name,
            platformType: account.platform?.type,
            oauthState: account.oauthState,
            oauthExpiresAt: account.oauthExpiresAt,
            oauthOpenId: account.oauthOpenId,
            lastRefreshAt: account.lastRefreshAt,
        };
    },
});
//# sourceMappingURL=oauth-manager.js.map