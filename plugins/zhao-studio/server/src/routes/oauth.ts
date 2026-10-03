// server/src/routes/oauth.ts
// OAuth 授权相关路由。导出 routes 数组，供 content-api.ts spread 引入。

type Method = 'GET' | 'POST';

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      'plugin::zhao-auth.is-authenticated',
      { name: 'plugin::zhao-auth.has-permission', config: { action: permission } },
    ],
  },
});

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

export default () => [
  adminRoute('GET', '/oauth/authorize/:accountId', 'oauth.getAuthorizeUrl', 'zhao-studio.publish-account.manage'),
  adminRoute('GET', '/oauth/status/:accountId', 'oauth.getStatus', 'zhao-studio.publish-account.manage'),
  adminRoute('POST', '/oauth/revoke/:accountId', 'oauth.revoke', 'zhao-studio.publish-account.manage'),
  publicRoute('GET', '/oauth/callback/:platformType', 'oauth.handleCallback'),
];
