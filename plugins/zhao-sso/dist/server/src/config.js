"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
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
            mode: "local",
            remoteUrl: "",
            appCode: "",
            appSecret: "",
        },
    },
};
