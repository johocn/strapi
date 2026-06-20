import os

base = r'e:\code\plugins\zhao-third\server\src'

# ============================================================
# 7. services/third-party-auth.ts
# ============================================================
service_code = r'''import type { Core } from "@strapi/strapi";

const THIRD_ACCOUNT_UID = "plugin::zhao-third.third-party-account";
const USER_UID = "plugin::users-permissions.user";
const CONFIG_UID = "plugin::zhao-third.third-party-config";

// Supported platform/appType combinations
const SUPPORTED_PLATFORMS = ["wechat", "alipay", "douyin"] as const;
const WECHAT_APP_TYPES = ["official_account", "mini_program", "open_platform"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];
type WechatAppType = (typeof WECHAT_APP_TYPES)[number];

interface ThirdPartyProfile {
  openId: string;
  unionId?: string;
  nickname?: string;
  avatar?: string;
  rawProfile?: Record<string, unknown>;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ═══════════════════════════════════════════
  // 1. Get OAuth authorization URL
  // ═══════════════════════════════════════════
  async getAuthUrl(
    platform: string,
    appType: string,
    redirectUri: string,
    state?: string
  ): Promise<string | null> {
    this.validatePlatform(platform, appType);

    // Mini program has no web auth URL
    if (platform === "wechat" && appType === "mini_program") {
      return null;
    }

    const config = await this.getPlatformConfig(platform, appType);
    const platformCfg = strapi.config.get("plugin::zhao-third")?.platforms?.[platform];
    const subTypeCfg = platformCfg?.subTypes?.[appType];

    if (!subTypeCfg?.authorizeUrl) {
      throw new Error(`Platform ${platform}/${appType} has no authorize URL configured`);
    }

    const params = new URLSearchParams({
      appid: config.appId,
      redirect_uri: redirectUri,
      response_type: subTypeCfg.parameters?.response_type || "code",
      scope: subTypeCfg.parameters?.scope || "snsapi_userinfo",
    });

    if (state) {
      params.set("state", state);
    }

    // WeChat requires #wechat_redirect for official_account and open_platform
    let url = `${subTypeCfg.authorizeUrl}?${params.toString()}`;
    if (platform === "wechat") {
      url += "#wechat_redirect";
    }

    return url;
  },

  // ═══════════════════════════════════════════
  // 2. Handle OAuth callback
  // ═══════════════════════════════════════════
  async handleCallback(
    platform: string,
    appType: string,
    code: string,
    inviteCode?: string,
    encryptedData?: string,
    iv?: string
  ): Promise<{ token: string; user: any; isNewUser: boolean }> {
    this.validatePlatform(platform, appType);

    // Step 1: Exchange code for platform user profile
    let profile: ThirdPartyProfile;

    if (platform === "wechat") {
      switch (appType) {
        case "official_account":
          profile = await this.handleWechatOfficialAccount(code);
          break;
        case "mini_program":
          profile = await this.handleWechatMiniProgram(code, encryptedData, iv);
          break;
        case "open_platform":
          profile = await this.handleWechatOpenPlatform(code);
          break;
        default:
          throw new Error(`Unsupported WeChat appType: ${appType}`);
      }
    } else if (platform === "alipay") {
      profile = await this.handleAlipay(code);
    } else if (platform === "douyin") {
      profile = await this.handleDouyin(code);
    } else {
      const err: any = new Error(`Unsupported platform: ${platform}`);
      err.code = "THIRD_001";
      throw err;
    }

    // Step 2: Find existing binding - prioritize unionId, fallback to openId+platform+appType
    let existingAccount = null;

    if (profile.unionId && platform === "wechat") {
      // For WeChat, try to find by unionId across all subTypes
      existingAccount = await strapi.db.query(THIRD_ACCOUNT_UID).findOne({
        where: {
          unionId: profile.unionId,
          platform: "wechat",
        },
        populate: ["user"],
      });
    }

    if (!existingAccount) {
      existingAccount = await strapi.db.query(THIRD_ACCOUNT_UID).findOne({
        where: {
          platform,
          appType,
          openId: profile.openId,
        },
        populate: ["user"],
      });
    }

    if (existingAccount?.user) {
      // Already bound - generate JWT and return
      const userId = typeof existingAccount.user === "object"
        ? existingAccount.user.id
        : existingAccount.user;
      const token = await this.generateToken(userId);
      return { token, user: existingAccount.user, isNewUser: false };
    }

    // Step 3: Auto-register new user
    const isNewUser = true;
    const username = `${platform}_${appType}_${profile.openId.substring(0, 8)}`;
    const randomPassword = Math.random().toString(36).substring(2, 18);

    const newUser = await strapi.db.query(USER_UID).create({
      data: {
        username,
        email: `${username}@third.placeholder`,
        password: randomPassword,
        provider: "third_party",
        confirmed: true,
        blocked: false,
      },
    });

    // Step 4: Create user-invite record via zhao-channel (if available)
    try {
      const userInviteService = strapi.plugin("zhao-channel").service("user-invite");
      await userInviteService.createForUser(newUser.id, inviteCode || undefined);
    } catch {
      // zhao-channel plugin not available, skip
      strapi.log.warn("zhao-third: zhao-channel not available, skipping user-invite creation");
    }

    // Step 5: Create third-party-account binding
    await strapi.db.query(THIRD_ACCOUNT_UID).create({
      data: {
        user: newUser.id,
        platform,
        appType,
        openId: profile.openId,
        unionId: profile.unionId || null,
        nickname: profile.nickname || null,
        avatar: profile.avatar || null,
        rawProfile: profile.rawProfile || null,
        boundAt: new Date().toISOString(),
      },
    });

    // Step 6: Generate JWT
    const token = await this.generateToken(newUser.id);

    return {
      token,
      user: { id: newUser.id, username: newUser.username },
      isNewUser,
    };
  },

  // ═══════════════════════════════════════════
  // 3. Bind platform account to existing user
  // ═══════════════════════════════════════════
  async bindAccount(
    userId: number,
    platform: string,
    appType: string,
    code: string
  ): Promise<any> {
    this.validatePlatform(platform, appType);

    let profile: ThirdPartyProfile;

    if (platform === "wechat") {
      switch (appType) {
        case "official_account":
          profile = await this.handleWechatOfficialAccount(code);
          break;
        case "mini_program":
          profile = await this.handleWechatMiniProgram(code);
          break;
        case "open_platform":
          profile = await this.handleWechatOpenPlatform(code);
          break;
        default:
          throw new Error(`Unsupported WeChat appType: ${appType}`);
      }
    } else if (platform === "alipay") {
      profile = await this.handleAlipay(code);
    } else if (platform === "douyin") {
      profile = await this.handleDouyin(code);
    } else {
      const err: any = new Error(`Unsupported platform: ${platform}`);
      err.code = "THIRD_001";
      throw err;
    }

    // Check if already bound by another user
    const existing = await strapi.db.query(THIRD_ACCOUNT_UID).findOne({
      where: {
        platform,
        appType,
        openId: profile.openId,
      },
    });

    if (existing) {
      const err: any = new Error("This third-party account is already bound");
      err.code = "THIRD_004";
      throw err;
    }

    const record = await strapi.db.query(THIRD_ACCOUNT_UID).create({
      data: {
        user: userId,
        platform,
        appType,
        openId: profile.openId,
        unionId: profile.unionId || null,
        nickname: profile.nickname || null,
        avatar: profile.avatar || null,
        rawProfile: profile.rawProfile || null,
        boundAt: new Date().toISOString(),
      },
    });

    return record;
  },

  // ═══════════════════════════════════════════
  // 4. Unbind platform account
  // ═══════════════════════════════════════════
  async unbindAccount(userId: number, platform: string, appType: string): Promise<void> {
    const existing = await strapi.db.query(THIRD_ACCOUNT_UID).findOne({
      where: {
        user: userId,
        platform,
        appType,
      },
    });

    if (!existing) {
      const err: any = new Error("No binding found");
      err.code = "THIRD_005";
      throw err;
    }

    await strapi.db.query(THIRD_ACCOUNT_UID).delete({
      where: { id: existing.id },
    });
  },

  // ═══════════════════════════════════════════
  // 5. Get user's bound accounts
  // ═══════════════════════════════════════════
  async getBoundAccounts(userId: number): Promise<any[]> {
    const accounts = await strapi.db.query(THIRD_ACCOUNT_UID).findMany({
      where: { user: userId },
    });

    return accounts.map((acc: any) => ({
      id: acc.id,
      platform: acc.platform,
      appType: acc.appType,
      nickname: acc.nickname,
      avatar: acc.avatar,
      boundAt: acc.boundAt,
    }));
  },

  // ═══════════════════════════════════════════
  // Platform-specific token exchange methods
  // ═══════════════════════════════════════════

  async handleWechatOfficialAccount(code: string): Promise<ThirdPartyProfile> {
    const config = await this.getPlatformConfig("wechat", "official_account");
    const wechatCfg = strapi.config.get("plugin::zhao-third")?.platforms?.wechat;

    // Exchange code for access_token
    const tokenParams = new URLSearchParams({
      appid: config.appId,
      secret: config.appSecret,
      code,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(`${wechatCfg.tokenUrl}?${tokenParams.toString()}`);
    const tokenData: any = await tokenRes.json();

    if (tokenData.errcode) {
      const err: any = new Error(`WeChat token exchange failed: ${tokenData.errmsg}`);
      err.code = "THIRD_002";
      throw err;
    }

    // Get user info
    const userParams = new URLSearchParams({
      access_token: tokenData.access_token,
      openid: tokenData.openid,
      lang: "zh_CN",
    });

    const userRes = await fetch(`${wechatCfg.userInfoUrl}?${userParams.toString()}`);
    const userData: any = await userRes.json();

    if (userData.errcode) {
      const err: any = new Error(`WeChat user info failed: ${userData.errmsg}`);
      err.code = "THIRD_003";
      throw err;
    }

    return {
      openId: userData.openid,
      unionId: userData.unionid,
      nickname: userData.nickname,
      avatar: userData.headimgurl,
      rawProfile: userData,
    };
  },

  async handleWechatMiniProgram(
    code: string,
    encryptedData?: string,
    iv?: string
  ): Promise<ThirdPartyProfile> {
    const config = await this.getPlatformConfig("wechat", "mini_program");
    const wechatCfg = strapi.config.get("plugin::zhao-third")?.platforms?.wechat;
    const subTypeCfg = wechatCfg?.subTypes?.mini_program;

    // Exchange code via jsCode2session
    const params = new URLSearchParams({
      appid: config.appId,
      secret: config.appSecret,
      js_code: code,
      grant_type: "authorization_code",
    });

    const res = await fetch(`${subTypeCfg.jsCode2sessionUrl}?${params.toString()}`);
    const data: any = await res.json();

    if (data.errcode) {
      const err: any = new Error(`WeChat mini program login failed: ${data.errmsg}`);
      err.code = "THIRD_002";
      throw err;
    }

    let profile: ThirdPartyProfile = {
      openId: data.openid,
      unionId: data.unionid,
      nickname: undefined,
      avatar: undefined,
      rawProfile: data,
    };

    // If encryptedData and iv provided, decrypt user info
    if (encryptedData && iv && data.session_key) {
      try {
        const decrypted = this.decryptWeChatData(encryptedData, iv, data.session_key);
        profile.nickname = decrypted.nickName || decrypted.nickname;
        profile.avatar = decrypted.avatarUrl || decrypted.avatar;
      } catch {
        strapi.log.warn("zhao-third: Failed to decrypt mini program user info");
      }
    }

    return profile;
  },

  async handleWechatOpenPlatform(code: string): Promise<ThirdPartyProfile> {
    // Open platform uses the same token/userinfo API as official_account
    return this.handleWechatOfficialAccount(code);
  },

  async handleAlipay(code: string): Promise<ThirdPartyProfile> {
    const config = await this.getPlatformConfig("alipay", "default");
    const alipayCfg = strapi.config.get("plugin::zhao-third")?.platforms?.alipay;

    // Alipay OAuth token exchange
    const params = new URLSearchParams({
      app_id: config.appId,
      method: "alipay.system.oauth.token",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().toISOString().replace(/[T]/g, " ").replace(/\.\d+Z/, ""),
      version: "1.0",
      grant_type: "authorization_code",
      code,
    });

    // Add signature (simplified - production needs RSA2 signing)
    const tokenUrl = `${alipayCfg.tokenUrl}?${params.toString()}`;
    const tokenRes = await fetch(tokenUrl, { method: "POST" });
    const tokenData: any = await tokenRes.json();

    if (tokenData.error_response) {
      const err: any = new Error(`Alipay token exchange failed: ${JSON.stringify(tokenData.error_response)}`);
      err.code = "THIRD_002";
      throw err;
    }

    const authToken = tokenData.alipay_system_oauth_token_response;
    return {
      openId: authToken.user_id,
      unionId: undefined,
      nickname: undefined,
      avatar: undefined,
      rawProfile: authToken,
    };
  },

  async handleDouyin(code: string): Promise<ThirdPartyProfile> {
    const config = await this.getPlatformConfig("douyin", "default");
    const douyinCfg = strapi.config.get("plugin::zhao-third")?.platforms?.douyin;

    // Exchange code for access_token
    const tokenParams = new URLSearchParams({
      client_key: config.appId,
      client_secret: config.appSecret,
      code,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(`${douyinCfg.tokenUrl}?${tokenParams.toString()}`);
    const tokenData: any = await tokenRes.json();

    if (tokenData.error) {
      const err: any = new Error(`Douyin token exchange failed: ${tokenData.error}`);
      err.code = "THIRD_002";
      throw err;
    }

    const accessToken = tokenData.access_token;
    const openId = tokenData.open_id;

    // Get user info
    const userParams = new URLSearchParams({
      access_token: accessToken,
      open_id: openId,
    });

    const userRes = await fetch(`${douyinCfg.userInfoUrl}?${userParams.toString()}`);
    const userData: any = await userRes.json();

    return {
      openId,
      unionId: undefined,
      nickname: userData?.data?.nickname,
      avatar: userData?.data?.avatar,
      rawProfile: userData,
    };
  },

  // ═══════════════════════════════════════════
  // Helper methods
  // ═══════════════════════════════════════════

  validatePlatform(platform: string, appType: string): void {
    if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
      const err: any = new Error(`Unsupported platform: ${platform}`);
      err.code = "THIRD_001";
      throw err;
    }
    if (platform === "wechat" && !WECHAT_APP_TYPES.includes(appType as any)) {
      const err: any = new Error(`Unsupported WeChat appType: ${appType}`);
      err.code = "THIRD_001";
      throw err;
    }
  },

  async getPlatformConfig(platform: string, appType: string): Promise<{ appId: string; appSecret: string }> {
    // Try to read from third-party-config content-type
    try {
      const config = await strapi.db.query(CONFIG_UID).findOne({
        where: {
          platform,
          appType,
          enabled: true,
        },
      });
      if (config) {
        return { appId: config.appId, appSecret: config.appSecret };
      }
    } catch {
      // Config content-type may not exist yet
    }

    const err: any = new Error(`Platform config not found: ${platform}/${appType}`);
    err.code = "THIRD_008";
    throw err;
  },

  async generateToken(userId: number): Promise<string> {
    // Use zhao-auth jwt service if available
    try {
      const jwtService = strapi.plugin("zhao-auth").service("jwt");
      const secret = jwtService.getSecret();

      const user = await strapi.db.query(USER_UID).findOne({
        where: { id: userId },
        populate: ["role"],
      });

      const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role?.name || "authenticated",
      };

      const jwt = await import("jsonwebtoken");
      return jwt.default.sign(payload, secret, { expiresIn: "7d" });
    } catch {
      // Fallback: try strapi built-in token generation
      const err: any = new Error("JWT generation failed: zhao-auth not available");
      err.code = "THIRD_006";
      throw err;
    }
  },

  decryptWeChatData(
    encryptedData: string,
    iv: string,
    sessionKey: string
  ): Record<string, unknown> {
    // WeChat encrypted data decryption using AES-128-CBC
    try {
      const crypto = require("crypto");
      const decipher = crypto.createDecipheriv(
        "aes-128-cbc",
        Buffer.from(sessionKey, "base64"),
        Buffer.from(iv, "base64")
      );
      decipher.setAutoPadding(true);
      let decoded = decipher.update(Buffer.from(encryptedData, "base64"), undefined, "utf8");
      decoded += decipher.final("utf8");
      return JSON.parse(decoded);
    } catch (e: any) {
      strapi.log.error("WeChat data decryption failed:", e.message);
      throw e;
    }
  },
});
'''

with open(os.path.join(base, 'services', 'third-party-auth.ts'), 'w', encoding='utf-8') as f:
    f.write(service_code)

# services/index.ts
with open(os.path.join(base, 'services', 'index.ts'), 'w', encoding='utf-8') as f:
    f.write('''import thirdPartyAuth from "./third-party-auth";

export default {
  "third-party-auth": thirdPartyAuth,
};
''')

print("Step 3 done: services")
