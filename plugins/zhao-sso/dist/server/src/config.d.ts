declare const _default: {
    default: {
        jwt: {
            algorithm: string;
            accessTokenExpiresIn: string;
            refreshTokenExpiresIn: string;
        };
        security: {
            loginMaxAttempts: number;
            loginLockDuration: string;
            authCodeExpiresIn: string;
        };
        defaults: {
            appCode: string;
        };
        loginUrl: string;
        channelSync: {
            mode: "local";
            remoteUrl: string;
            appCode: string;
            appSecret: string;
        };
    };
};
export default _default;
