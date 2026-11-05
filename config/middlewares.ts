import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'x-site-id', 'x-site-domain'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      // 微信回调以 text/xml 推送，需开启 text 解析使 koa-body 将请求体写入 ctx.request.body(字符串)
      text: true,
      textLimit: '5mb',
      // 微信支付 APIv3 验签需要逐字节原始报文，koa-body 会写入 body[Symbol.for('unparsedBody')]
      includeUnparsed: true,
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
