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
      appCode: "default",
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
