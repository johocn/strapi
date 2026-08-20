import axios from "axios";
import type { Core } from "@strapi/strapi";

const CONFIG_UID = "plugin::zhao-sso.sso-oauth-config";

/**
 * 微信公众号模板消息通道
 * 依赖 sso-oauth-config 中 provider=wechat, app_type=official_account 配置获取 access_token。
 * 支持 mock 模式(MSG_WECHAT_PROVIDER=mock)：不真正调微信，直接返回成功，便于本地联调。
 */
export function createWechatTemplateChannel({ strapi }: { strapi: Core.Strapi }) {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  async function getAccessToken(): Promise<string> {
    const provider = process.env.MSG_WECHAT_PROVIDER || "wechat";
    if (provider === "mock") return "mock_access_token";

    const config = await strapi.db.query(CONFIG_UID).findOne({
      where: { provider: "wechat", app_type: "official_account", is_enabled: true },
    });
    if (!config) {
      throwErr("SSO_MSG_WECHAT_001", 500, "[zhao-sso] 未找到公众号(wechat/official_account)配置，请在后台配置");
    }

    const res = await axios.get("https://api.weixin.qq.com/cgi-bin/token", {
      params: { grant_type: "client_credential", appid: config.app_id.trim(), secret: config.app_secret },
      timeout: 10000,
    });
    const data = res.data || {};
    if (data.errcode) {
      throwErr("SSO_MSG_WECHAT_010", 502, `WeChat token error: ${data.errmsg}`);
    }
    return data.access_token;
  }

  return {
    provider: "wechat",

    /**
     * 发送模板消息
     * @param opts { openid, templateId, url, data }  data 为 {字段名:{value}}，调用方已按模板字段映射
     * @returns { msgId, raw }  微信返回 msgid + 原始数据
     */
    async send(opts: { openid: string; templateId: string; url?: string; data: Record<string, { value: string }> }) {
      const provider = process.env.MSG_WECHAT_PROVIDER || "wechat";
      const accessToken = await getAccessToken();

      if (provider === "mock") {
        return { msgId: `mock_${Date.now()}`, raw: { errcode: 0, errmsg: "mock ok", msgid: Date.now() } };
      }

      const body: any = {
        touser: opts.openid,
        template_id: opts.templateId,
        data: opts.data,
      };
      if (opts.url) body.url = opts.url;

      const res = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        body,
        { timeout: 10000 }
      );
      const data = res.data || {};

      // 43101=用户未关注公众号；其他非 0 视为失败
      if (data.errcode === 43101) {
        throwErr("SSO_MSG_NOT_SUBSCRIBE", 420, "用户未关注公众号");
      }
      if (data.errcode) {
        throwErr("SSO_MSG_WECHAT_020", 502, `WeChat template send error: ${data.errmsg}(${data.errcode})`);
      }
      return { msgId: data.msgid, raw: data };
    },
  };
}