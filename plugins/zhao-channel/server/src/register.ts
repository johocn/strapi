import type { Core } from "@strapi/strapi";
import { runWithContext } from "./utils/registration-context";
import ssoAppAuth from "./policies/sso-app-auth";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  (strapi as any).server.use(async (ctx: any, next: () => Promise<any>) => {
    await runWithContext(ctx.url, () => next());
  });

  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-channel", {
    "sso-app-auth": ssoAppAuth,
  });

  strapi.log.info("[zhao-channel] 渠道权限策略已注册到 zhao-auth");
};

export default register;
