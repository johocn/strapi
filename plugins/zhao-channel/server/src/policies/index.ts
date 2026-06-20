/**
 * zhao-channel 策略导出
 * 权限策略已统一到 zhao-auth 的 has-permission
 * sso-app-auth: SSO 远程调用签名验证策略
 */
import ssoAppAuth from "./sso-app-auth";

export default {
  "sso-app-auth": ssoAppAuth,
};
