import type { Core } from '@strapi/strapi';

/**
 * 插件配置 - Windows 绝对路径方案
 * 适用于：Windows 本地开发环境
 * 插件目录：E:/code/plugins/（绝对路径）
 * 
 * 使用说明：
 * 1. 将此文件重命名为 plugins.ts 即可启用
 * 2. 确保 E:/code/plugins/ 目录存在且包含所有插件
 * 3. 适用于插件目录不在项目内的场景
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    "zhao-auth": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-auth",
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
        resolve: "E:/code/plugins/zhao-channel",
    },
    "zhao-common": {
        enabled: true,
        resolve: "E:/code/basic/plugins/zhao-common",
    },
    "zhao-third": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-third",
        config: {
            platforms: {
                wechat: {
                    subTypes: {
                        official_account: {
                            authorizeUrl: "https://open.weixin.qq.com/connect/oauth2/authorize",
                            parameters: {
                                response_type: "code",
                                scope: "snsapi_base",
                            },
                        },
                        mini_program: {},
                        open_platform: {
                            authorizeUrl: "https://open.weixin.qq.com/connect/qrconnect",
                            parameters: {
                                response_type: "code",
                                scope: "snsapi_login",
                            },
                        },
                    },
                },
                alipay: {
                    subTypes: {
                        default: {
                            authorizeUrl: "https://openauth.alipay.com/oauth2/publicAppAuthorize.htm",
                            parameters: {
                                response_type: "code",
                                scope: "auth_user",
                            },
                        },
                    },
                },
                douyin: {
                    subTypes: {
                        default: {
                            authorizeUrl: "https://open.douyin.com/platform/oauth/connect",
                            parameters: {
                                response_type: "code",
                                scope: "user_info",
                            },
                        },
                    },
                },
            },
        },
    },
    "zhao-course": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-course",
    },
    "zhao-point": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-point",
    },
    "zhao-quiz": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-quiz",
    },
    "zhao-oss": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-oss",
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
        resolve: "E:/code/plugins/zhao-sso",
        config: {
            jwt: {
                secret: env("SSO_JWT_SECRET"),
            },
        },
    },
    "zhao-tag": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-tag",
    },
    "zhao-wealth": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-wealth",
    },
    "zhao-studio": {
        enabled: true,
        resolve: "E:/code/plugins/zhao-studio",
    },
});

export default config;