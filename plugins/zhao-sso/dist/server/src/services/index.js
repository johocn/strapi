"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sso_jwt_1 = __importDefault(require("./sso-jwt"));
const sso_user_1 = __importDefault(require("./sso-user"));
const sso_login_log_1 = __importDefault(require("./sso-login-log"));
const sso_channel_1 = __importDefault(require("./sso-channel"));
const sso_oauth_1 = __importDefault(require("./sso-oauth"));
const sso_auth_1 = __importDefault(require("./sso-auth"));
const sso_wechat_1 = __importDefault(require("./sso-wechat"));
const sso_alipay_1 = __importDefault(require("./sso-alipay"));
const channel_sync_1 = __importDefault(require("./channel-sync"));
const sso_app_1 = __importDefault(require("./sso-app"));
const sso_oauth_config_1 = __importDefault(require("./sso-oauth-config"));
const sso_sms_1 = __importDefault(require("./sso-sms"));
const sso_invite_1 = __importDefault(require("./sso-invite"));
exports.default = {
    "sso-jwt": sso_jwt_1.default,
    "sso-user": sso_user_1.default,
    "sso-login-log": sso_login_log_1.default,
    "sso-channel": sso_channel_1.default,
    "sso-oauth": sso_oauth_1.default,
    "sso-auth": sso_auth_1.default,
    "sso-wechat": sso_wechat_1.default,
    "sso-alipay": sso_alipay_1.default,
    "channel-sync": channel_sync_1.default,
    "sso-app": sso_app_1.default,
    "sso-oauth-config": sso_oauth_config_1.default,
    "sso-sms": sso_sms_1.default,
    "sso-invite": sso_invite_1.default,
};
