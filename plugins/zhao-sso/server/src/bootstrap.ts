import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");

  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" },
  });

  if (!defaultApp) {
    // 从环境变量读取默认密钥,未配置时跳过创建(避免硬编码密钥上生产)
    const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
    if (!rawSecret) {
      strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
      return;
    }
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: await bcrypt.hash(rawSecret, 10),
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }
};

export default bootstrap;
