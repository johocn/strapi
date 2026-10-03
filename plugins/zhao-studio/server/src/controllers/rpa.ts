// server/src/controllers/rpa.ts
// RPA cookie 录入链路：手动粘贴 cookie / 扫码登录会话 / 状态查询。

import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getCookiesStatus(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      const data = await rpaClient.getCookiesStatus(accountId);
      ctx.body = { ok: true, data };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  /** 手动录入：从浏览器 DevTools 复制的 cookie JSON 数组 */
  async saveCookies(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const { cookies } = ctx.request.body || {};
      if (!Array.isArray(cookies)) {
        ctx.status = 400;
        ctx.body = { ok: false, error: 'cookies 必须是数组' };
        return;
      }
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      await rpaClient.saveCookies(accountId, cookies);
      ctx.body = { ok: true, data: { cookieCount: cookies.length } };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  async clearCookies(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      await rpaClient.clearCookies(accountId);
      ctx.body = { ok: true };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  /** 扫码登录：返回二维码截图（dataURL），会话在进程内保留 5 分钟 */
  async startLogin(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      const data = await rpaClient.openLoginSession(accountId);
      ctx.body = { ok: true, data };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  /** 扫码完成后抓取并保存 cookie */
  async finishLogin(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      const data = await rpaClient.finishLoginSession(accountId);
      ctx.body = { ok: true, data };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },

  async cancelLogin(ctx: any) {
    try {
      const { accountId } = ctx.params;
      const rpaClient = strapi.plugin('zhao-studio').service('rpa-client');
      await rpaClient.closeLoginSession(accountId);
      ctx.body = { ok: true };
    } catch (e: any) {
      ctx.status = 400;
      ctx.body = { ok: false, error: e.message };
    }
  },
});