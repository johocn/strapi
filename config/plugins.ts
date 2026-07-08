import type { Core } from '@strapi/strapi';

/**
 * 插件配置 - 相对路径方案
 * 适用于：Linux/Mac/通用环境
 * 插件目录：./plugins/（相对于项目根目录）
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    i18n: {
        enabled: true,
        config: {
            defaultLocale: "zh-CN",
            locales: [
                { code: "zh-CN", name: "中文 (简体)" },
            ],
        },
    },
    "zhao-auth": {
        enabled: true,
        resolve: "./plugins/zhao-auth",
        config: {
            authenticate: {
                publicPaths: [
                    '/api/auth/local',
                    '/api/auth/local/register',
                    '/api/auth/forgot-password',
                    '/api/auth/reset-password',
                    '/admin',
                    '/_health',
                    '/documentation',
                    '/api/auth/email-confirmation',
                    '/api/auth/send-email-confirmation',
                    '/api/connect/(.*)',
                ],
            },
        },
    },
    "zhao-channel": {
        enabled: true,
        resolve: "./plugins/zhao-channel",
    },
    "zhao-common": {
        enabled: true,
        resolve: "./plugins/zhao-common",
    },
    "zhao-third": {
        enabled: true,
        resolve: "./plugins/zhao-third",
        config: {
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
    },
    "zhao-course": {
        enabled: true,
        resolve: "./plugins/zhao-course",
    },
    "zhao-point": {
        enabled: true,
        resolve: "./plugins/zhao-point",
    },
    "zhao-quiz": {
        enabled: true,
        resolve: "./plugins/zhao-quiz",
    },
    "zhao-oss": {
        enabled: true,
        resolve: "./plugins/zhao-oss",
        config: {
            providers: [
                {
                    name: "aliyun",
                    enabled: true,
                    primary: true,
                    options: {
                        accessKeyId: env("ALIYUN_OSS_ACCESS_KEY_ID"),
                        accessKeySecret: env("ALIYUN_OSS_ACCESS_KEY_SECRET"),
                        bucket: env("ALIYUN_OSS_BUCKET"),
                        region: env("ALIYUN_OSS_REGION"),
                    },
                },
            ],
            maxRetries: 3,
            uploadTimeoutMs: 30000,
        },
    },
    "zhao-sso": {
        enabled: true,
        resolve: "./plugins/zhao-sso",
    },
    "zhao-tag": {
        enabled: true,
        resolve: "./plugins/zhao-tag",
    },
    "zhao-wealth": {
        enabled: true,
        resolve: "./plugins/zhao-wealth",
    },
    "zhao-studio": {
        enabled: true,
        resolve: "./plugins/zhao-studio",
    },
    "zhao-website": {
        enabled: true,
        resolve: "./plugins/zhao-website",
    },
});

export default config;