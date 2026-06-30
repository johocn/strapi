import ssoUser from "./sso-user";
import ssoThirdPartyBinding from "./sso-third-party-binding";
import ssoApp from "./sso-app";
import ssoChannel from "./sso-channel";
import ssoAuthCode from "./sso-auth-code";
import ssoToken from "./sso-token";
import ssoUserAppRole from "./sso-user-app-role";
import ssoLoginLog from "./sso-login-log";
import ssoInviteCode from "./sso-invite-code";
import ssoInviteUsage from "./sso-invite-usage";
import ssoReferralRelation from "./sso-referral-relation";
import ssoInviteStats from "./sso-invite-stats";

export default {
  "sso-user": ssoUser,
  "sso-third-party-binding": ssoThirdPartyBinding,
  "sso-app": ssoApp,
  "sso-channel": ssoChannel,
  "sso-auth-code": ssoAuthCode,
  "sso-token": ssoToken,
  "sso-user-app-role": ssoUserAppRole,
  "sso-login-log": ssoLoginLog,
  "sso-invite-code": ssoInviteCode,
  "sso-invite-usage": ssoInviteUsage,
  "sso-referral-relation": ssoReferralRelation,
  "sso-invite-stats": ssoInviteStats,
};
