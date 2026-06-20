import type { Core } from '@strapi/strapi';

/**
 * 插件配置 - 相对路径方案
 * 适用于：Linux/Mac/通用环境
 * 插件目录：./plugins/（相对于项目根目录）
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
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
});

export default config;