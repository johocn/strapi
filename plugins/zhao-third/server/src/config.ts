export default {
  default: {
    platforms: {
      wechat: {
        official_account: {
          authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize",
          parameters: ["appid", "redirect_uri", "response_type", "scope", "state"],
        },
        mini_program: {},
        open_platform: {
          authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect",
          parameters: ["appid", "redirect_uri", "response_type", "scope", "state"],
        },
      },
      alipay: {
        h5: {
          authorizeUrl: "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm",
          parameters: ["app_id", "scope", "redirect_uri"],
        },
      },
      douyin: {
        h5: {
          authorizeUrl: "https://open.douyin.com/platform/oauth/connect",
          parameters: ["client_key", "scope", "redirect_uri", "response_type", "state"],
        },
      },
    },
  },
  validator: () => {},
};
