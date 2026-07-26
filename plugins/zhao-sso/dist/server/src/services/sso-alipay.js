"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    async function getConfig() {
        var _a;
        const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
        const config = await configService.findByProvider("alipay");
        if (!config)
            throwErr("SSO_ALIPAY_001", 500, "[zhao-sso] Alipay OAuth 配置未找到(请在后台配置 provider=alipay)");
        // 支付宝需要 privateKey,从 extraConfig 读取
        const privateKey = (_a = config.extraConfig) === null || _a === void 0 ? void 0 : _a.privateKey;
        if (!privateKey)
            throwErr("SSO_ALIPAY_002", 500, "Alipay OAuth privateKey 未配置(extraConfig.privateKey)");
        return { ...config, privateKey };
    }
    return {
        async getAuthorizeUrl(state) {
            const config = await getConfig();
            const serverUrl = strapi.config.get("server.url", "http://localhost:1337");
            const redirectUri = `${serverUrl}/api/zhao-sso/auth/alipay/callback`;
            const params = new URLSearchParams({
                app_id: config.appId,
                redirect_uri: redirectUri,
                scope: "auth_user",
                state,
            });
            return `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?${params.toString()}`;
        },
        async handleCallback(code) {
            const config = await getConfig();
            const tokenRes = await this.requestToken(config.appId, config.privateKey, code);
            const userId = tokenRes.user_id;
            const binding = await strapi.db.query(BINDING_UID).findOne({
                where: { provider: "alipay", provider_user_id: userId },
                populate: { user: true },
            });
            if (binding) {
                return { userId: binding.user.id, isNew: false };
            }
            let userInfo = {};
            try {
                userInfo = await this.fetchUserInfo(config.appId, config.privateKey, tokenRes.access_token);
            }
            catch { /* ignore */ }
            const user = await strapi.db.query(USER_UID).create({
                data: {
                    uuid: (0, uuid_1.v4)(),
                    nickname: userInfo.nick_name || null,
                    avatar_url: userInfo.avatar || null,
                    status: "active",
                    login_count: 0,
                },
            });
            await strapi.db.query(BINDING_UID).create({
                data: {
                    user: { id: user.id },
                    provider: "alipay",
                    provider_user_id: userId,
                    provider_nickname: userInfo.nick_name || null,
                    provider_avatar: userInfo.avatar || null,
                    provider_data: tokenRes,
                    bound_at: new Date(),
                },
            });
            return { userId: user.id, isNew: true };
        },
        async requestToken(appId, privateKey, code) {
            const bizContent = { grant_type: "authorization_code", code };
            const params = this.buildAlipayParams(appId, "alipay.system.oauth.token", bizContent);
            const sign = this.signParams(params, privateKey);
            params.sign = sign;
            const res = await axios_1.default.post("https://openapi.alipay.com/gateway.do", null, { params });
            const respKey = "alipay_system_oauth_token_response";
            if (res.data[respKey])
                return res.data[respKey];
            throwErr("SSO_ALIPAY_003", 502, `Alipay token error: ${JSON.stringify(res.data)}`);
        },
        async fetchUserInfo(appId, privateKey, accessToken) {
            const bizContent = { auth_token: accessToken };
            const params = this.buildAlipayParams(appId, "alipay.user.info.share", bizContent);
            const sign = this.signParams(params, privateKey);
            params.sign = sign;
            const res = await axios_1.default.post("https://openapi.alipay.com/gateway.do", null, { params });
            const respKey = "alipay_user_info_share_response";
            if (res.data[respKey])
                return res.data[respKey];
            return {};
        },
        buildAlipayParams(appId, method, bizContent) {
            return {
                app_id: appId,
                method,
                charset: "utf-8",
                sign_type: "RSA2",
                timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
                version: "1.0",
                biz_content: JSON.stringify(bizContent),
            };
        },
        signParams(params, privateKey) {
            const sorted = Object.keys(params)
                .filter((k) => k !== "sign" && params[k])
                .sort()
                .map((k) => `${k}=${params[k]}`)
                .join("&");
            const sign = crypto_1.default.createSign("RSA-SHA256");
            sign.update(sorted);
            sign.end();
            return sign.sign(privateKey, "base64");
        },
    };
};
