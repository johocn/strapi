import type { Core } from "@strapi/strapi";
import ssoAuthenticated from "./policies/sso-authenticated";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Strapi v5:用 strapi.policy 注册策略
  if (strapi.policy) {
    strapi.policy("plugin::zhao-sso", "sso-authenticated", ssoAuthenticated);
  } else {
    // fallback 旧 API(兼容性)
    const policyRegistry = strapi.get("policies");
    policyRegistry.add("plugin::zhao-sso", {
      "sso-authenticated": ssoAuthenticated,
    });
  }
  strapi.log.info("[zhao-sso] Plugin registered, policies added to registry");
};

export default register;
