"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const AUTH_CODE_UID = "plugin::zhao-sso.sso-auth-code";
const APP_UID = "plugin::zhao-sso.sso-app";
function parseDuration(str) {
    const match = str.match(/^(\d+)(m|d|h|s)$/);
    if (!match)
        return 10 * 60 * 1000;
    const val = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case "s": return val * 1000;
        case "m": return val * 60 * 1000;
        case "h": return val * 60 * 60 * 1000;
        case "d": return val * 24 * 60 * 60 * 1000;
        default: return 10 * 60 * 1000;
    }
}
exports.default = ({ strapi }) => {
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    return {
        async generateAuthCode(params) {
            var _a;
            const { userId, appCode, redirectUri, channelCode, inviteCode, scopes } = params;
            const app = await this.findApp(appCode);
            if (!app || !app.is_active)
                throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
            if (!this.validateRedirectUri(app, redirectUri))
                throwErr("SSO_OAUTH_002", 400, "redirect_uri 不在允许列表中");
            const code = (0, uuid_1.v4)() + "-" + (0, uuid_1.v4)();
            const pluginConfig = strapi.config.get("plugin::zhao-sso");
            const expiresIn = ((_a = pluginConfig === null || pluginConfig === void 0 ? void 0 : pluginConfig.security) === null || _a === void 0 ? void 0 : _a.authCodeExpiresIn) || "10m";
            const expiresMs = parseDuration(expiresIn);
            await strapi.db.query(AUTH_CODE_UID).create({
                data: {
                    code,
                    user: { id: userId },
                    app_code: appCode,
                    redirect_uri: redirectUri,
                    channel_code: channelCode || null,
                    invite_code: inviteCode || null,
                    scopes: scopes || null,
                    expires_at: new Date(Date.now() + expiresMs),
                    used: false,
                },
            });
            return code;
        },
        async exchangeCode(params) {
            const { code, appCode, appSecret, redirectUri } = params;
            const app = await this.findApp(appCode);
            if (!app || !app.is_active)
                throwErr("SSO_OAUTH_001", 404, "应用不存在或已禁用");
            if (!bcryptjs_1.default.compareSync(appSecret, app.app_secret))
                throwErr("SSO_OAUTH_003", 401, "app_secret 验证失败");
            const authCode = await strapi.db.query(AUTH_CODE_UID).findOne({
                where: { code, app_code: appCode },
                populate: ["user"],
            });
            if (!authCode)
                throwErr("SSO_OAUTH_004", 404, "授权码不存在");
            if (authCode.used)
                throwErr("SSO_OAUTH_005", 400, "授权码已使用");
            if (new Date(authCode.expires_at) < new Date())
                throwErr("SSO_OAUTH_006", 400, "授权码已过期");
            if (authCode.redirect_uri !== redirectUri)
                throwErr("SSO_OAUTH_007", 400, "redirect_uri 不匹配");
            await strapi.db.query(AUTH_CODE_UID).update({
                where: { id: authCode.id },
                data: { used: true },
            });
            return {
                userId: authCode.user.id,
                channelCode: authCode.channel_code,
                inviteCode: authCode.invite_code,
                scopes: authCode.scopes,
            };
        },
        async findApp(appCode) {
            return strapi.db.query(APP_UID).findOne({ where: { app_code: appCode } });
        },
        validateRedirectUri(app, redirectUri) {
            const allowed = app.redirect_uris || [];
            return allowed.some((pattern) => {
                if (pattern.includes("*")) {
                    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
                    return regex.test(redirectUri);
                }
                return pattern === redirectUri;
            });
        },
    };
};
