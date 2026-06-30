import type { Core } from "@strapi/strapi";
import ssoAuthenticated from "./policies/sso-authenticated";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const policyRegistry = strapi.get("policies");
  policyRegistry.add("plugin::zhao-sso", {
    "sso-authenticated": ssoAuthenticated,
  });
  strapi.log.info("[zhao-sso] Plugin registered, policies added to registry");
};

export default register;
