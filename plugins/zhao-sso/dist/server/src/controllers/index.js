"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = __importDefault(require("./auth-controller"));
const oauth_controller_1 = __importDefault(require("./oauth-controller"));
const user_controller_1 = __importDefault(require("./user-controller"));
const channel_controller_1 = __importDefault(require("./channel-controller"));
const admin_controller_1 = __importDefault(require("./admin-controller"));
const token_controller_1 = __importDefault(require("./token-controller"));
const auth_code_controller_1 = __importDefault(require("./auth-code-controller"));
const binding_controller_1 = __importDefault(require("./binding-controller"));
const oauth_config_controller_1 = __importDefault(require("./oauth-config-controller"));
const role_controller_1 = __importDefault(require("./role-controller"));
const invite_code_controller_1 = __importDefault(require("./invite-code-controller"));
const invite_usage_controller_1 = __importDefault(require("./invite-usage-controller"));
const referral_controller_1 = __importDefault(require("./referral-controller"));
const sms_code_controller_1 = __importDefault(require("./sms-code-controller"));
exports.default = {
    "auth-controller": auth_controller_1.default,
    "oauth-controller": oauth_controller_1.default,
    "user-controller": user_controller_1.default,
    "channel-controller": channel_controller_1.default,
    "admin-controller": admin_controller_1.default,
    token: token_controller_1.default,
    "auth-code": auth_code_controller_1.default,
    binding: binding_controller_1.default,
    "oauth-config": oauth_config_controller_1.default,
    role: role_controller_1.default,
    "invite-code": invite_code_controller_1.default,
    "invite-usage": invite_usage_controller_1.default,
    referral: referral_controller_1.default,
    "sms-code": sms_code_controller_1.default,
};
