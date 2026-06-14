import type { Core } from '@strapi/strapi';

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
    resolve: "E:/code/plugins/zhao-common",
  },
  "zhao-third": {
    enabled: true,
    resolve: "E:/code/plugins/zhao-third",
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
  "users-permissions": {
    enabled: true,
  },
});

export default config;