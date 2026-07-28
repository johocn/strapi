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
};

export default bootstrap;
