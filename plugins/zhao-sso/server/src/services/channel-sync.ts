import type { Core } from "@strapi/strapi";
import * as crypto from "crypto";

export interface ChannelSyncResult {
  success: boolean;
  message?: string;
}

export interface IChannelSyncService {
  syncUserInvite(
    ssoUserId: number,
    inviteCode?: string,
    channelCode?: string
  ): Promise<ChannelSyncResult>;
}

/**
 * LocalChannelSync: 同进程直接调用 zhao-channel 服务
 */
export const createLocalChannelSync = ({ strapi }: { strapi: Core.Strapi }): IChannelSyncService => ({
  async syncUserInvite(ssoUserId: number, inviteCode?: string, channelCode?: string): Promise<ChannelSyncResult> {
    const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
    if (!userInviteService || typeof userInviteService.createForUser !== "function") {
      return { success: false, message: "zhao-channel user-invite 服务不可用" };
    }

    await userInviteService.createForUser(ssoUserId, undefined, undefined, inviteCode, channelCode);
    return { success: true };
  },
});

/**
 * RemoteChannelSync: 通过 HTTP API 调用远程 zhao-channel
 * 使用 app_code + app_secret 签名认证，最多重试 3 次（指数退避）
 */
export const createRemoteChannelSync = ({
  strapi,
  config,
}: {
  strapi: Core.Strapi;
  config: { remoteUrl?: string; appCode?: string; appSecret?: string };
}): IChannelSyncService => ({
  async syncUserInvite(ssoUserId: number, inviteCode?: string, channelCode?: string): Promise<ChannelSyncResult> {
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
      } catch (e: any) {
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

/**
 * Strapi 服务注册适配（默认导出）
 * 暴露 getSync() 方法供 sso-auth 使用
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  getSync(): IChannelSyncService | null {
    const config = strapi.config.get("plugin::zhao-sso.channelSync") || strapi.plugin("zhao-sso")?.config("channelSync");
    const configTyped = config as { mode?: string; remoteUrl?: string; appCode?: string; appSecret?: string } | undefined;
    const mode = configTyped?.mode || "local";

    if (mode === "off") return null;
    if (mode === "remote") return createRemoteChannelSync({ strapi, config: configTyped || {} });
    return createLocalChannelSync({ strapi });
  },
});
