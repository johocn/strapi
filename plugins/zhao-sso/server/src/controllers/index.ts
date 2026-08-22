import authController from "./auth-controller";
import oauthController from "./oauth-controller";
import userController from "./user-controller";
import channelController from "./channel-controller";
import adminController from "./admin-controller";
import tokenController from "./token-controller";
import authCodeController from "./auth-code-controller";
import bindingController from "./binding-controller";
import oauthConfigController from "./oauth-config-controller";
import roleController from "./role-controller";
import inviteCodeController from "./invite-code-controller";
import inviteUsageController from "./invite-usage-controller";
import referralController from "./referral-controller";
import smsCodeController from "./sms-code-controller";
import messageController from "./message-controller";
import sopController from "./sop-controller";
import profileController from "./profile-controller";
import partnerController from "./partner-controller";
import msgVersionController from "./msg-version-controller";
import recommendController from "./recommend-controller";
import noticeController from "./notice-controller";
import msgStats from "./msg-stats";
import wxCallbackController from "./wx-callback-controller";
import wxQrcodeController from "./wx-qrcode-controller";
import wxMenuController from "./wx-menu-controller";

export default {
  "auth-controller": authController,
  "oauth-controller": oauthController,
  "user-controller": userController,
  "channel-controller": channelController,
  "admin-controller": adminController,
  token: tokenController,
  "auth-code": authCodeController,
  binding: bindingController,
  "oauth-config": oauthConfigController,
  role: roleController,
  "invite-code": inviteCodeController,
  "invite-usage": inviteUsageController,
  referral: referralController,
  "sms-code": smsCodeController,
  message: messageController,
  sop: sopController,
  profile: profileController,
  partner: partnerController,
  "msg-version": msgVersionController,
  "recommend-controller": recommendController,
  "notice-controller": noticeController,
  "msg-stats": msgStats,
  "wx-callback": wxCallbackController,
  "wx-qrcode": wxQrcodeController,
  "wx-menu": wxMenuController,
};
