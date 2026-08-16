import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");

  // 从环境变量读取默认密钥,未配置时跳过创建(避免硬编码密钥上生产)
  const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
  if (!rawSecret) {
    strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
    return;
  }
  const hashedSecret = await bcrypt.hash(rawSecret, 10);

  // 确保 'course' 应用存在（与 zhao-common getPublicConfig 的 ssoAppCode 默认值一致）
  const courseApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "course" },
  });
  if (!courseApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "course",
        app_name: "课程应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=course)");
  }

  // 向后兼容：如果旧版 'default' 应用存在则保留，不存在则创建一份（供历史 app_code=default 的请求使用）
  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" },
  });
  if (!defaultApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }

  // 确保 'wealth' 应用存在（理财应用）
  const wealthApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "wealth" },
  });
  if (!wealthApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "wealth",
        app_name: "理财应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=wealth)");
  }

  // 确保 'e-joho-app' 应用存在
  const eJohoApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "e-joho-app" },
  });
  if (!eJohoApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "e-joho-app",
        app_name: "E-Joho 应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=e-joho-app)");
  }

  // 确保 Vendure 商城各租户的 SSO 应用存在
  // 与 vendure 仓库 china-data/02-default-channel.ts、03-shop-a-channel.ts 的 ssoProviders 配置对应：
  //   - vendure-default: 默认租户（default channel），clientSecret 明文 = 'default-app-secret'
  //   - vendure-shop-a: shop-a 租户（shop-a channel），clientSecret 明文 = 'shop-a-app-secret'
  const vendureApps = [
    { app_code: "vendure-default", app_name: "Vendure 商城默认租户", rawSecret: "default-app-secret" },
    { app_code: "vendure-shop-a", app_name: "Vendure 商城 shop-a 租户", rawSecret: "shop-a-app-secret" },
  ];
  for (const { app_code, app_name, rawSecret } of vendureApps) {
    const existing = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
      where: { app_code },
    });
    if (!existing) {
      const vendureSecret = await bcrypt.hash(rawSecret, 10);
      await strapi.db.query("plugin::zhao-sso.sso-app").create({
        data: {
          app_code,
          app_name,
          app_secret: vendureSecret,
          redirect_uris: ["https://shop.joho.cn/*", "http://localhost:*"],
          allowed_grant_types: ["authorization_code", "refresh_token"],
          is_active: true,
        },
      });
      strapi.log.info(`[zhao-sso] Vendure app created (app_code=${app_code})`);
    }
  }
};

export default bootstrap;
