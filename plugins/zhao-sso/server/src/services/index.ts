import ssoJwt from "./sso-jwt";
import ssoUser from "./sso-user";
import ssoLoginLog from "./sso-login-log";
import ssoChannel from "./sso-channel";
import ssoOauth from "./sso-oauth";
import ssoAuth from "./sso-auth";
import ssoWechat from "./sso-wechat";
import ssoAlipay from "./sso-alipay";
import channelSync from "./channel-sync";
import ssoApp from "./sso-app";
import ssoOauthConfig from "./sso-oauth-config";
import ssoSms from "./sso-sms";

export default {
  "sso-jwt": ssoJwt,
  "sso-user": ssoUser,
  "sso-login-log": ssoLoginLog,
  "sso-channel": ssoChannel,
  "sso-oauth": ssoOauth,
  "sso-auth": ssoAuth,
  "sso-wechat": ssoWechat,
  "sso-alipay": ssoAlipay,
  "channel-sync": channelSync,
  "sso-app": ssoApp,
  "sso-oauth-config": ssoOauthConfig,
  "sso-sms": ssoSms,
};
