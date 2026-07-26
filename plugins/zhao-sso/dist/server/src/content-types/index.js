"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sso_user_1 = __importDefault(require("./sso-user"));
const sso_third_party_binding_1 = __importDefault(require("./sso-third-party-binding"));
const sso_app_1 = __importDefault(require("./sso-app"));
const sso_channel_1 = __importDefault(require("./sso-channel"));
const sso_auth_code_1 = __importDefault(require("./sso-auth-code"));
const sso_token_1 = __importDefault(require("./sso-token"));
const sso_user_app_role_1 = __importDefault(require("./sso-user-app-role"));
const sso_login_log_1 = __importDefault(require("./sso-login-log"));
const sso_invite_code_1 = __importDefault(require("./sso-invite-code"));
const sso_invite_usage_1 = __importDefault(require("./sso-invite-usage"));
const sso_referral_relation_1 = __importDefault(require("./sso-referral-relation"));
const sso_invite_stats_1 = __importDefault(require("./sso-invite-stats"));
const sso_oauth_config_1 = __importDefault(require("./sso-oauth-config"));
const sso_sms_code_1 = __importDefault(require("./sso-sms-code"));
exports.default = {
    "sso-user": sso_user_1.default,
    "sso-third-party-binding": sso_third_party_binding_1.default,
    "sso-app": sso_app_1.default,
    "sso-channel": sso_channel_1.default,
    "sso-auth-code": sso_auth_code_1.default,
    "sso-token": sso_token_1.default,
    "sso-user-app-role": sso_user_app_role_1.default,
    "sso-login-log": sso_login_log_1.default,
    "sso-invite-code": sso_invite_code_1.default,
    "sso-invite-usage": sso_invite_usage_1.default,
    "sso-referral-relation": sso_referral_relation_1.default,
    "sso-invite-stats": sso_invite_stats_1.default,
    "sso-oauth-config": sso_oauth_config_1.default,
    "sso-sms-code": sso_sms_code_1.default,
};
