"use strict";
// server/src/services/auth/providers/xiaohongshu.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../utils");
function globalXhsCfg(strapi) {
    return strapi.plugin('zhao-studio').config()?.publish?.platforms?.xiaohongshu || {};
}
exports.default = ({ strapi }) => ({
    platformType: 'xiaohongshu',
    displayName: '小红书开放平台',
    async buildAuthorizeUrl(state, accountId) {
        const acctCfg = await (0, utils_1.getAccountConfig)(strapi, accountId);
        const gCfg = globalXhsCfg(strapi);
        const clientId = acctCfg.clientId || gCfg.clientId || process.env.XHS_CLIENT_ID;
        const redirectUri = acctCfg.redirectUri || gCfg.redirectUri || process.env.XHS_REDIRECT_URI || '';
        if (!clientId)
            throw new Error('xiaohongshu 未配置 clientId');
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'user_info,note.create',
            state,
        });
        return `https://open.xiaohongshu.com/oauth/authorize?${params.toString()}`;
    },
    async exchangeToken(code, accountId) {
        const acctCfg = await (0, utils_1.getAccountConfig)(strapi, accountId);
        const gCfg = globalXhsCfg(strapi);
        const clientId = acctCfg.clientId || gCfg.clientId || process.env.XHS_CLIENT_ID;
        const clientSecret = acctCfg.clientSecret || gCfg.clientSecret || process.env.XHS_CLIENT_SECRET;
        if (!clientId || !clientSecret)
            throw new Error('xiaohongshu 未配置 clientId/clientSecret');
        const res = await axios_1.default.post('https://open.xiaohongshu.com/oauth/access_token', { client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        const data = res.data;
        if (data.code && data.code !== 0) {
            throw new Error(`xiaohongshu exchangeToken 失败: code=${data.code} msg=${data.msg}`);
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: (0, utils_1.computeExpiresAt)(data.expires_in),
            openId: data.open_id || data.user_id,
            scope: data.scope || '',
            rawResponse: data,
        };
    },
    async refreshToken(refreshToken, accountId) {
        const acctCfg = await (0, utils_1.getAccountConfig)(strapi, accountId);
        const gCfg = globalXhsCfg(strapi);
        const clientId = acctCfg.clientId || gCfg.clientId || process.env.XHS_CLIENT_ID;
        const clientSecret = acctCfg.clientSecret || gCfg.clientSecret || process.env.XHS_CLIENT_SECRET;
        if (!clientId || !clientSecret)
            throw new Error('xiaohongshu 未配置 clientId/clientSecret');
        const res = await axios_1.default.post('https://open.xiaohongshu.com/oauth/refresh_token', { client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        const data = res.data;
        if (data.code && data.code !== 0) {
            throw new Error(`xiaohongshu refreshToken 失败: code=${data.code} msg=${data.msg}`);
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: (0, utils_1.computeExpiresAt)(data.expires_in),
            rawResponse: data,
        };
    },
});
//# sourceMappingURL=xiaohongshu.js.map