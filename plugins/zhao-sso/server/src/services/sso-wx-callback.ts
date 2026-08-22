import crypto from "crypto";
import type { Core } from "@strapi/strapi";
import { parseXml, buildXml } from "../utils/wechat-xml";

const EVENT_UID = "plugin::zhao-sso.sso-wx-event";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * 读取公众号服务器配置（注入 sso-oauth-config(wechat/official_account).extra_config）
   */
  async function getExtraConfig() {
    const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
    const config = await configService.findByProviderAndAppType("wechat", "official_account");
    return {
      serverToken: config?.extraConfig?.serverToken || "",
      welcomeReply: config?.extraConfig?.welcomeReply || "",
    };
  }

  /**
   * 微信回调验签：sha1(sort([token,timestamp,nonce]).join("")) === signature
   */
  async function verifySignature(params: { timestamp?: string | number; nonce?: string | number; signature?: string }): Promise<boolean> {
    const { timestamp, nonce, signature } = params;
    if (!timestamp || !nonce || !signature) return false;
    const { serverToken } = await getExtraConfig();
    if (!serverToken) return false;
    const sorted = [serverToken, String(timestamp), String(nonce)].sort().join("");
    const hash = crypto.createHash("sha1").update(sorted).digest("hex");
    return hash === signature;
  }

  return {
    /** 读取服务器配置（供后台展示 / server-url） */
    async getServerConfig() {
      const { serverToken, welcomeReply } = await getExtraConfig();
      return {
        url: "/api/zhao-sso/v1/wechat/callback",
        token: serverToken,
        welcomeReply,
        encMode: "plain",
      };
    },

    verifySignature,

    /**
     * 处理微信推送消息/事件（验签由 controller 层完成，此处只做业务分发与落库）
     * 返回被动回复内容（关注+配置了欢迎语返回文本 XML，否则返回微信认可的 success）
     */
    async handleXml(xml: string): Promise<string> {
      const msg = parseXml(xml);
      const openid = msg.FromUserName || "";
      const toUser = msg.ToUserName || "";
      const msgType = msg.MsgType || "";
      const eventName = msg.Event || "";

      // 事件归类
      let event = "other";
      let eventKey: string | null = null;
      let sceneKey: string | null = null;
      if (msgType === "event") {
        if (eventName === "subscribe") {
          event = "subscribe";
          if ((msg.EventKey || "").startsWith("qrscene_")) {
            sceneKey = msg.EventKey.slice("qrscene_".length) || null;
          }
        } else if (eventName === "unsubscribe") {
          event = "unsubscribe";
        } else if (eventName === "SCAN") {
          event = "SCAN";
          sceneKey = msg.EventKey || null;
        } else if (eventName === "CLICK") {
          event = "CLICK";
          eventKey = msg.EventKey || null;
        }
      } else if (msgType === "text") {
        event = "text";
      }
      eventKey = eventKey || msg.EventKey || null;

      // 写入事件日志
      const created = await strapi.db.query(EVENT_UID).create({
        data: {
          openid,
          event,
          event_key: eventKey,
          scene_key: sceneKey,
          payload: msg,
        },
      });

      // 回填绑定关系关注状态与 openid_bound
      const binding = await strapi.db.query(BINDING_UID).findOne({
        where: { provider: "wechat", provider_user_id: openid },
        select: ["id"],
      });
      if (binding) {
        // 标记该 openid 已绑定 SSO 用户
        await strapi.db.query(EVENT_UID).update({
          where: { id: created.id },
          data: { openid_bound: true },
        });
        if (event === "subscribe") {
          await strapi.db.query(BINDING_UID).update({
            where: { id: binding.id },
            data: { subscribe: 1, subscribe_at: new Date(), subscribe_check_at: new Date() },
          });
        } else if (event === "unsubscribe") {
          await strapi.db.query(BINDING_UID).update({
            where: { id: binding.id },
            data: { subscribe: 0, subscribe_check_at: new Date() },
          });
        }
      }

      // 被动回复：仅关注事件且配置了欢迎语时返回文本回复，其余返回 success
      if (event === "subscribe") {
        const { welcomeReply } = await getExtraConfig();
        if (welcomeReply) {
          return buildXml({
            ToUserName: openid,
            FromUserName: toUser,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: "text",
            Content: welcomeReply,
          });
        }
      }
      return "success";
    },
  };
};