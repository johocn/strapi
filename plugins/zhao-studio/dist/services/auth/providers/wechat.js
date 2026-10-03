"use strict";
// server/src/services/auth/providers/wechat.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../utils");
exports.default = ({ strapi }) => ({
    platformType: 'wechat',
    displayName: '微信公众号',
    buildAuthorizeUrl(state) {
        const appConfig = strapi.plugin('zhao-sso').service('sso-oauth-config');
        const cfg = appConfig.findByProviderAndAppType('wechat', 'official_account');
        if (!cfg) {
            throw new Error('zhao-sso 未配置 wechat official_account OAuth');
        }
        const redirectUri = (cfg.redirectUris && cfg.redirectUris[0]) || process.env.WECHAT_REDIRECT_URI || '';
        const scope = cfg.scope || 'snsapi_userinfo';
        const params = new URLSearchParams({
            appid: cfg.appId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope,
            state,
        });
        return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
    },
    async exchangeToken(code) {
        const cfg = await strapi.plugin('zhao-sso').service('sso-oauth-config')
            .findByProviderAndAppType('wechat', 'official_account');
        if (!cfg)
            throw new Error('zhao-sso 未配置 wechat official_account OAuth');
        const url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
        const params = {
            appid: cfg.appId,
            secret: cfg.appSecret,
            code,
            grant_type: 'authorization_code',
        };
        const res = await axios_1.default.get(url, { params, timeout: 15000 });
        const data = res.data;
        if (data.errcode) {
            throw new Error(`wechat exchangeToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: (0, utils_1.computeExpiresAt)(data.expires_in),
            openId: data.openid,
            scope: data.scope,
            rawResponse: data,
        };
    },
    async refreshToken(refreshToken) {
        const cfg = await strapi.plugin('zhao-sso').service('sso-oauth-config')
            .findByProviderAndAppType('wechat', 'official_account');
        if (!cfg)
            throw new Error('zhao-sso 未配置 wechat official_account OAuth');
        const url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
        const params = {
            appid: cfg.appId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        };
        const res = await axios_1.default.get(url, { params, timeout: 15000 });
        const data = res.data;
        if (data.errcode) {
            throw new Error(`wechat refreshToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: (0, utils_1.computeExpiresAt)(data.expires_in),
            rawResponse: data,
        };
    },
});
//# sourceMappingURL=wechat.js.map