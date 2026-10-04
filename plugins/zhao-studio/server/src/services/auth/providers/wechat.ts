// server/src/services/auth/providers/wechat.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt, getAccountConfig } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'wechat',
  displayName: '微信公众号',

  async buildAuthorizeUrl(state: string, accountId: string): Promise<string> {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const ssoCfg = strapi.plugin('zhao-sso').service('sso-oauth-config')
      .findByProviderAndAppType('wechat', 'official_account');

    // 两级 fallback：account.config 优先（运营后台 per-account 可配），否则 zhao-sso 全局
    const appId = acctCfg.appId || ssoCfg?.appId || '';
    if (!appId) throw new Error('wechat 未配置 appId（account.config.appId 或 zhao-sso）');

    const redirectUri = acctCfg.redirectUri
      || (ssoCfg?.redirectUris && ssoCfg.redirectUris[0])
      || process.env.WECHAT_REDIRECT_URI
      || '';
    // redirectUri 未配置时允许空（与修复前行为一致），由微信侧拒绝
    // 运营后台后续可在 account.config.redirectUri 或 .env.WECHAT_REDIRECT_URI 配置

    const scope = (ssoCfg?.scope as string) || 'snsapi_userinfo';

    const params = new URLSearchParams({
      appid: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  },

  async exchangeToken(code: string, accountId: string) {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const ssoCfg = strapi.plugin('zhao-sso').service('sso-oauth-config')
      .findByProviderAndAppType('wechat', 'official_account');

    const appId = acctCfg.appId || ssoCfg?.appId || '';
    const appSecret = acctCfg.appSecret || ssoCfg?.appSecret || '';
    if (!appId || !appSecret) throw new Error('wechat 未配置 appId/appSecret');

    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    const params = { appid: appId, secret: appSecret, code, grant_type: 'authorization_code' };

    const res = await axios.get(url, { params, timeout: 15000 });
    const data = res.data;

    if (data.errcode) {
      throw new Error(`wechat exchangeToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.openid,
      scope: data.scope,
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string, accountId: string) {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const ssoCfg = strapi.plugin('zhao-sso').service('sso-oauth-config')
      .findByProviderAndAppType('wechat', 'official_account');

    const appId = acctCfg.appId || ssoCfg?.appId || '';
    if (!appId) throw new Error('wechat 未配置 appId');

    const url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
    const params = { appid: appId, grant_type: 'refresh_token', refresh_token: refreshToken };

    const res = await axios.get(url, { params, timeout: 15000 });
    const data = res.data;

    if (data.errcode) {
      throw new Error(`wechat refreshToken 失败: errcode=${data.errcode} errmsg=${data.errmsg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
