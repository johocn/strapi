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
    const tokenCache = new Map();
    const ticketCache = new Map();
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    async function getConfig(appType) {
        const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
        const config = await configService.findByProviderAndAppType("wechat", appType);
        if (!config)
            throwErr("SSO_WECHAT_001", 500, `[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat, appType=${appType})`);
        return config;
    }
    async function getValidAccessToken(config) {
        const cacheKey = config.appId.trim();
        const cached = tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now() + 60000) {
            return cached.value;
        }
        const fetchToken = async () => {
            const res = await axios_1.default.get("https://api.weixin.qq.com/cgi-bin/token", {
                params: {
                    grant_type: "client_credential",
                    appid: config.appId.trim(),
                    secret: config.appSecret,
                },
            });
            return res.data || {};
        };
        let data = await fetchToken();
        if (data.errcode === 40001) {
            tokenCache.delete(cacheKey);
            data = await fetchToken();
        }
        if (data.errcode) {
            throwErr("SSO_WECHAT_010", 502, `WeChat token error: ${data.errmsg}`);
        }
        const expiresIn = data.expires_in || 7200;
        tokenCache.set(cacheKey, {
            value: data.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
        });
        return data.access_token;
    }
    async function getJsapiTicket(accessToken) {
        const cached = ticketCache.get(accessToken);
        if (cached && cached.expiresAt > Date.now() + 60000) {
            return cached.value;
        }
        const res = await axios_1.default.get("https://api.weixin.qq.com/cgi-bin/ticket/getticket", {
            params: { access_token: accessToken, type: "jsapi" },
        });
        const data = res.data || {};
        if (data.errcode) {
            throwErr("SSO_WECHAT_011", 502, `WeChat ticket error: ${data.errmsg}`);
        }
        const expiresIn = data.expires_in || 7200;
        ticketCache.set(accessToken, {
            value: data.ticket,
            expiresAt: Date.now() + expiresIn * 1000,
        });
        return data.ticket;
    }
    return {
        async getAuthorizeUrl(state, appType, scope, callbackUrl) {
            const config = await getConfig(appType);
            const cleanAppId = config.appId.trim();
            if (appType === "mini_program") {
                return "";
            }
            if (appType === "open_platform") {
                const finalScope = scope || "snsapi_login";
                const params = new URLSearchParams({
                    appid: cleanAppId,
                    redirect_uri: callbackUrl || "",
                    response_type: "code",
                    scope: finalScope,
                    state,
                });
                return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
            }
            // official_account / app
            const finalScope = scope || "snsapi_userinfo";
            const params = new URLSearchParams({
                appid: cleanAppId,
                redirect_uri: callbackUrl || "",
                response_type: "code",
                scope: finalScope,
                state,
            });
            return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
        },
        async handleCallback(code, appType) {
            const config = await getConfig(appType);
            const cleanAppId = config.appId.trim();
            let openid;
            let unionid = null;
            let tokenData = {};
            let userInfo = null;
            if (appType === "mini_program") {
                const sessionRes = await axios_1.default.get("https://api.weixin.qq.com/sns/jscode2session", {
                    params: {
                        appid: cleanAppId,
                        secret: config.appSecret,
                        js_code: code,
                        grant_type: "authorization_code",
                    },
                });
                if (sessionRes.data.errcode) {
                    throwErr("SSO_WECHAT_004", 502, `WeChat jscode2session error: ${sessionRes.data.errmsg}`);
                }
                openid = sessionRes.data.openid;
                unionid = sessionRes.data.unionid || null;
                tokenData = sessionRes.data;
            }
            else {
                // official_account / open_platform / app
                const tokenRes = await axios_1.default.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
                    params: {
                        appid: cleanAppId,
                        secret: config.appSecret,
                        code,
                        grant_type: "authorization_code",
                    },
                });
                if (tokenRes.data.errcode)
                    throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);
                openid = tokenRes.data.openid;
                unionid = tokenRes.data.unionid || null;
                tokenData = tokenRes.data;
                const wxAccessToken = tokenRes.data.access_token;
                let userInfoRes = {};
                try {
                    userInfoRes = await axios_1.default.get("https://api.weixin.qq.com/sns/userinfo", {
                        params: { access_token: wxAccessToken, openid },
                    });
                }
                catch { /* ignore */ }
                userInfo = userInfoRes.data;
            }
            const binding = await strapi.db.query(BINDING_UID).findOne({
                where: { provider: "wechat", provider_user_id: openid },
                populate: { user: true },
            });
            if (binding) {
                return { userId: binding.user.id, isNew: false };
            }
            const user = await strapi.db.query(USER_UID).create({
                data: {
                    uuid: (0, uuid_1.v4)(),
                    nickname: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname) || null,
                    avatar_url: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl) || null,
                    status: "active",
                    login_count: 0,
                },
            });
            await strapi.db.query(BINDING_UID).create({
                data: {
                    user: { id: user.id },
                    provider: "wechat",
                    provider_user_id: openid,
                    provider_union_id: unionid,
                    provider_nickname: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname) || null,
                    provider_avatar: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl) || null,
                    provider_data: tokenData,
                    bound_at: new Date(),
                },
            });
            return { userId: user.id, isNew: true };
        },
        async getJssdkSignature(url, appType) {
            const config = await getConfig(appType);
            const accessToken = await getValidAccessToken(config);
            const ticket = await getJsapiTicket(accessToken);
            const nonceStr = (0, uuid_1.v4)().replace(/-/g, "").substring(0, 16);
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
            const signature = crypto_1.default.createHash("sha1").update(raw).digest("hex");
            return {
                appId: config.appId.trim(),
                timestamp,
                nonceStr,
                signature,
            };
        },
        async getWechatLoginConfig(appType) {
            var _a;
            const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
            const config = await configService.findByProviderAndAppType("wechat", appType);
            if (!config) {
                return { enabled: false, appType, oauthScopes: [], appId: null };
            }
            return {
                enabled: true,
                appType,
                oauthScopes: ((_a = config.extraConfig) === null || _a === void 0 ? void 0 : _a.oauthScopes) || ["snsapi_userinfo"],
                appId: config.appId,
            };
        },
    };
};
