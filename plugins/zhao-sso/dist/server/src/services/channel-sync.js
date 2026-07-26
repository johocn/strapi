"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRemoteChannelSync = exports.createLocalChannelSync = void 0;
const crypto = __importStar(require("crypto"));
/**
 * LocalChannelSync: 同进程直接调用 zhao-channel 服务
 */
const createLocalChannelSync = ({ strapi }) => ({
    async syncUserInvite(ssoUserId, inviteCode, channelCode) {
        const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
        if (!userInviteService || typeof userInviteService.createForUser !== "function") {
            return { success: false, message: "zhao-channel user-invite 服务不可用" };
        }
        // inviteCode 是邀请人的码（v.joho.cn），应传给 inviterCode（第 2 参数）建立 invitedBy 关系
        // externalInviteCode（第 4 参数）留 undefined，让 createForUser 自动生成本用户的码
        await userInviteService.createForUser(ssoUserId, inviteCode, undefined, undefined, channelCode);
        return { success: true };
    },
});
exports.createLocalChannelSync = createLocalChannelSync;
/**
 * RemoteChannelSync: 通过 HTTP API 调用远程 zhao-channel
 * 使用 app_code + app_secret 签名认证，最多重试 3 次（指数退避）
 */
const createRemoteChannelSync = ({ strapi, config, }) => ({
    async syncUserInvite(ssoUserId, inviteCode, channelCode) {
        const { remoteUrl, appCode, appSecret } = config;
        if (!remoteUrl || !appCode || !appSecret) {
            return { success: false, message: "RemoteChannelSync 配置不完整（remoteUrl/appCode/appSecret）" };
        }
        const url = `${remoteUrl.replace(/\/+$/, "")}/api/zhao-channel/v1/admin/user-invites/sync`;
        const body = JSON.stringify({ userId: ssoUserId, inviteCode, channelCode });
        const maxRetries = 3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // 每次重试重新生成签名（避免时间戳过期）
                const timestamp = Date.now().toString();
                const signature = crypto
                    .createHmac("sha256", appSecret)
                    .update(`${appCode}${timestamp}${body}`)
                    .digest("hex");
                const headers = {
                    "Content-Type": "application/json",
                    "X-App-Code": appCode,
                    "X-Timestamp": timestamp,
                    "X-Signature": signature,
                };
                const response = await fetch(url, {
                    method: "POST",
                    headers,
                    body,
                });
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, message: typeof data === "string" ? data : JSON.stringify(data) };
                }
                // 4xx 错误不重试
                if (response.status >= 400 && response.status < 500) {
                    const text = await response.text();
                    return { success: false, message: `HTTP ${response.status}: ${text}` };
                }
                // 5xx 错误重试
                strapi.log.warn(`[zhao-sso] RemoteChannelSync 第 ${attempt + 1} 次失败: HTTP ${response.status}`);
            }
            catch (e) {
                strapi.log.warn(`[zhao-sso] RemoteChannelSync 第 ${attempt + 1} 次异常: ${e.message}`);
            }
            // 指数退避：1s, 2s
            if (attempt < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
        return { success: false, message: `RemoteChannelSync 重试 ${maxRetries} 次后仍失败` };
    },
});
exports.createRemoteChannelSync = createRemoteChannelSync;
/**
 * Strapi 服务注册适配（默认导出）
 * 暴露 getSync() 方法供 sso-auth 使用
 */
exports.default = ({ strapi }) => ({
    getSync() {
        var _a;
        const config = strapi.config.get("plugin::zhao-sso.channelSync") || ((_a = strapi.plugin("zhao-sso")) === null || _a === void 0 ? void 0 : _a.config("channelSync"));
        const configTyped = config;
        const mode = (configTyped === null || configTyped === void 0 ? void 0 : configTyped.mode) || "local";
        if (mode === "off")
            return null;
        if (mode === "remote")
            return (0, exports.createRemoteChannelSync)({ strapi, config: configTyped || {} });
        return (0, exports.createLocalChannelSync)({ strapi });
    },
});
