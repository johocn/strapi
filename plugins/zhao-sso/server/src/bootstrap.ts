import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");

  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" },
  });

  if (!defaultApp) {
    const bcrypt = require("bcryptjs");
    const rawSecret = "sso_default_secret_change_me";
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
