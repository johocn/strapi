import ssoAuthenticated from "./sso-authenticated";
import fallbackAuthenticated from "./fallback-authenticated";
import fallbackHasPermission from "./fallback-has-permission";

export default {
  "sso-authenticated": ssoAuthenticated,
  "fallback-authenticated": fallbackAuthenticated,
  "fallback-has-permission": fallbackHasPermission,
};
