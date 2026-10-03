// server/src/services/auth/providers/xiaohongshu.ts

import axios from 'axios';
import type { Core } from '@strapi/strapi';
import type { IOAuthProvider } from '../types';
import { computeExpiresAt } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }): IOAuthProvider => ({
  platformType: 'xiaohongshu',
  displayName: '小红书开放平台',

  buildAuthorizeUrl(state: string): string {
    const cfg = ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const redirectUri = cfg.redirectUri || process.env.XHS_REDIRECT_URI || '';
    if (!clientId) throw new Error('zhao-studio 未配置 xiaohongshu clientId');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'user_info,note.create',
      state,
    });
    return `https://open.xiaohongshu.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeToken(code: string) {
    const cfg = ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const clientSecret = cfg.clientSecret || process.env.XHS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('zhao-studio 未配置 xiaohongshu clientId/clientSecret');

    const res = await axios.post(
      'https://open.xiaohongshu.com/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data;

    if (data.code && data.code !== 0) {
      throw new Error(`xiaohongshu exchangeToken 失败: code=${data.code} msg=${data.msg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      openId: data.open_id || data.user_id,
      scope: data.scope || '',
      rawResponse: data,
    };
  },

  async refreshToken(refreshToken: string) {
    const cfg = ((strapi as any).plugin('zhao-studio').config() as any)?.publish?.platforms?.xiaohongshu || {};
    const clientId = cfg.clientId || process.env.XHS_CLIENT_ID;
    const clientSecret = cfg.clientSecret || process.env.XHS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('zhao-studio 未配置 xiaohongshu clientId/clientSecret');

    const res = await axios.post(
      'https://open.xiaohongshu.com/oauth/refresh_token',
      { client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const data = res.data;

    if (data.code && data.code !== 0) {
      throw new Error(`xiaohongshu refreshToken 失败: code=${data.code} msg=${data.msg}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: computeExpiresAt(data.expires_in),
      rawResponse: data,
    };
  },
});
