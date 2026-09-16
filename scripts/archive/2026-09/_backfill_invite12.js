const { createStrapi } = require("@strapi/strapi");
const uid = 12;
const appCode = "course";

(async () => {
  const strapi = createStrapi({ appDir: process.cwd(), distDir: "./dist" });
  await strapi.load();
  const svc = strapi.service("plugin::zhao-sso.sso-invite");
  if (!svc?.ensureOwnInviteCode) { console.log("MISSING_METHOD"); process.exit(1); }
  const code = await svc.ensureOwnInviteCode(uid, appCode);
  console.log("OWN_INVITE_CODE=", code, "for uid", uid, "app", appCode);
  process.exit(0);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });