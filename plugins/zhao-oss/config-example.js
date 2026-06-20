// CMS 配置示例 - 将此文件放入 Strapi 项目的 config/plugins.js 中
// 路径: <strapi-project>/config/plugins.js

module.exports = {
  // ... existing plugins ...

  'zhao-oss': {
    enabled: true,
    resolve: './src/plugins/zhao-oss',
    config: {
      enabled: true,
      uploadTimeoutMs: 30000,
      maxRetries: 3,
      healthCheckIntervalMs: 60000,
      syncDelete: true,
      fallbackToLocal: true,
      providers: [
        {
          name: 'aliyun',
          displayName: '阿里云 OSS',
          enabled: true,
          primary: true,
          options: {
            region: 'oss-cn-hangzhou',
            accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
            bucket: 'my-app-uploads',
            basePath: 'uploads',
            secure: true,
            // cname: 'cdn.example.com',       // 可选：自定义域名
            // internalEndpoint: 'oss-cn-hangzhou-internal.aliyuncs.com', // 可选：内网地址
          },
        },
        // 预留：腾讯云 COS
        // {
        //   name: 'tencent',
        //   displayName: '腾讯云 COS',
        //   enabled: false,
        //   primary: false,
        //   options: {
        //     region: 'ap-guangzhou',
        //     secretId: process.env.TENCENT_COS_SECRET_ID,
        //     secretKey: process.env.TENCENT_COS_SECRET_KEY,
        //     bucket: 'my-app-uploads-1234567890',
        //   },
        // },
        // 预留：AWS S3
        // {
        //   name: 'aws-s3',
        //   displayName: 'AWS S3',
        //   enabled: false,
        //   primary: false,
        //   options: {
        //     region: 'us-east-1',
        //     accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        //     secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        //     bucket: 'my-app-uploads',
        //   },
        // },
      ],
    },
  },
};
