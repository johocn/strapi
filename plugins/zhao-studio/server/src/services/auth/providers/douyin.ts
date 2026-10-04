// server/src/services/auth/providers/douyin.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt, getAccountConfig } from '../utils';

function globalDouyinCfg(strapi: any) {
  return ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.douyin || {};
}

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'douyin',
  displayName: '抖音开放平台',

  async buildAuthorizeUrl(state: string, accountId: string): Promise<string> {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const gCfg = globalDouyinCfg(strapi);

    const clientKey = acctCfg.clientKey || gCfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const redirectUri = acctCfg.redirectUri || gCfg.redirectUri || process.env.DOUYIN_REDIRECT_URI || '';
    if (!clientKey) throw new Error('douyin 未配置 clientKey');

    const params = new URLSearchParams({
      response_type: 'code',
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: 'user_info,aweme.create',
      state,
    });
    return `https://open.douyin.com/platform/oauth/authorize?${params.toString()}`;
  },

  async exchangeToken(code: string, accountId: string) {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const gCfg = globalDouyinCfg(strapi);

    const clientKey = acctCfg.clientKey || gCfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = acctCfg.clientSecret || gCfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error('douyin 未配置 clientKey/clientSecret');

    const res = await axios.post(
      'https://open.douyin.com/oauth/access_token/',
      { client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data?.data || res.data;

    if (res.data?.message !== 'success') {
      throw new Error(`douyin exchangeToken 失败: ${res.data?.message || JSON.stringify(res.data)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.open_id,
      scope: data.scope,
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string, accountId: string) {
    const acctCfg = await getAccountConfig(strapi, accountId);
    const gCfg = globalDouyinCfg(strapi);

    const clientKey = acctCfg.clientKey || gCfg.clientKey || process.env.DOUYIN_CLIENT_KEY;
    const clientSecret = acctCfg.clientSecret || gCfg.clientSecret || process.env.DOUYIN_CLIENT_SECRET;
    if (!clientKey || !clientSecret) throw new Error('douyin 未配置 clientKey/clientSecret');

    const res = await axios.post(
      'https://open.douyin.com/oauth/refresh_token/',
      { client_key: clientKey, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data?.data || res.data;

    if (res.data?.message !== 'success') {
      throw new Error(`douyin refreshToken 失败: ${res.data?.message || JSON.stringify(res.data)}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
