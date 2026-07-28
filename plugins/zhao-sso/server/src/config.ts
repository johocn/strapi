export default {
  default: {
    jwt: {
      algorithm: "HS256",
      accessTokenExpiresIn: "15m",
      refreshTokenExpiresIn: "30d",
    },
    security: {
      loginMaxAttempts: 5,
      loginLockDuration: "30m",
      authCodeExpiresIn: "10m",
    },
    defaults: {
      // 与 zhao-common getPublicConfig 的 ssoAppCode 默认值保持一致
      // 避免前端拿到 'course'、后端兜底 'default' 导致 app_code 不匹配
      appCode: "course",
    },
    loginUrl: "/sso/login",
    channelSync: {
      mode: "local" as const,
      remoteUrl: "",
      appCode: "",
      appSecret: "",
    },
  },
};
