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
const message_controller_1 = __importDefault(require("./message-controller"));
const sop_controller_1 = __importDefault(require("./sop-controller"));
const profile_controller_1 = __importDefault(require("./profile-controller"));
const partner_controller_1 = __importDefault(require("./partner-controller"));
const msg_version_controller_1 = __importDefault(require("./msg-version-controller"));
const recommend_controller_1 = __importDefault(require("./recommend-controller"));
const notice_controller_1 = __importDefault(require("./notice-controller"));
const msg_stats_1 = __importDefault(require("./msg-stats"));
const wx_callback_controller_1 = __importDefault(require("./wx-callback-controller"));
const wx_qrcode_controller_1 = __importDefault(require("./wx-qrcode-controller"));
const wx_menu_controller_1 = __importDefault(require("./wx-menu-controller"));
const wx_reply_controller_1 = __importDefault(require("./wx-reply-controller"));
const wx_material_controller_1 = __importDefault(require("./wx-material-controller"));
const wx_article_controller_1 = __importDefault(require("./wx-article-controller"));
const sop_manual_1 = __importDefault(require("./sop-manual"));
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
    message: message_controller_1.default,
    sop: sop_controller_1.default,
    profile: profile_controller_1.default,
    partner: partner_controller_1.default,
    "msg-version": msg_version_controller_1.default,
    "recommend-controller": recommend_controller_1.default,
    "notice-controller": notice_controller_1.default,
    "msg-stats": msg_stats_1.default,
    "wx-callback": wx_callback_controller_1.default,
    "wx-qrcode": wx_qrcode_controller_1.default,
    "wx-menu": wx_menu_controller_1.default,
    "wx-reply": wx_reply_controller_1.default,
    "wx-material": wx_material_controller_1.default,
    "wx-article": wx_article_controller_1.default,
    "sop-manual": sop_manual_1.default,
};
//# sourceMappingURL=index.js.map