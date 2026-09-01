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

  /**
   * 组装被动文本回复 XML（text 事件命中关键字/fallback，subscribe 命中 welcome）
   * article 类型规则被动回复不支持图文，仅回提示文本
   */
  function buildTextReply(openid: string, toUser: string, content: string): string {
    return buildXml({
      ToUserName: openid,
      FromUserName: toUser,
      CreateTime: Math.floor(Date.now() / 1000),
      MsgType: "text",
      Content: content,
    });
  }

  function replyContent(rule: { reply_type?: string; text?: string; title?: string }): string {
    if (rule.reply_type === "article") {
      return rule.text || rule.title || "已收到您的消息";
    }
    return rule.text || "";
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
     * 管理员在公众号回复留言：校验 openid 归属 manualSop.adminNotifyUsers 名单后，
     * 调用 zhao-point 落库回复。返回 'ok' | 'unauthorized' | 'notfound'。
     */
    async handleAdminMessageReply(openid: string, messageId: number, reply: string): Promise<string> {
      try {
        const ssoPlug = strapi.plugin("zhao-sso");
        const sop = ssoPlug?.service("sso-sop");
        const admins = sop && typeof sop.adminNotifyUsers === "function" ? sop.adminNotifyUsers() : [];
        if (!admins || admins.length === 0) return "unauthorized";
        const binding = await strapi.db.query(BINDING_UID).findOne({
          where: { provider: "wechat", provider_user_id: openid },
          populate: { user: true },
        });
        const ssoUserId = binding?.user?.id ?? binding?.user;
        if (!ssoUserId || !admins.includes(Number(ssoUserId))) return "unauthorized";
        const zpSvc = strapi.plugin("zhao-point")?.service("activity");
        if (!zpSvc || typeof zpSvc.replyMessageByWechat !== "function") return "unauthorized";
        await zpSvc.replyMessageByWechat({ messageId, reply });
        return "ok";
      } catch (e: any) {
        strapi.log.warn(`[zhao-sso:wx-callback] handleAdminMessageReply failed: ${e.message}`);
        throw e;
      }
    },

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

      // 被动回复：text 关键字/fallback 命中文案，subscribe 命中 welcome 规则（优先于 welcomeReply 兜底）
      const replySvc = strapi.plugin("zhao-sso").service("sso-wx-reply");

      if (event === "text") {
        const text = String(msg.Content || "").trim();
        // 管理员回复留言：公众号里回复 “回复 {留言编号} 内容”
        const replyMatch = text.match(/^回复\s*(\d{1,8})\s+([\s\S]+)$/);
        if (replyMatch) {
          try {
            const status = await this.handleAdminMessageReply(openid, Number(replyMatch[1]), replyMatch[2].trim());
            if (status === "ok") return buildTextReply(openid, toUser, "已提交回复");
            if (status === "unauthorized") return buildTextReply(openid, toUser, "无回复权限");
            return buildTextReply(openid, toUser, "留言不存在或已回复");
          } catch (e: any) {
            strapi.log.warn(`[zhao-sso:wx-callback] message reply parse failed: ${e.message}`);
            return "success";
          }
        }
        const rule = await replySvc.matchText(text);
        if (rule && replyContent(rule)) {
          return buildTextReply(openid, toUser, replyContent(rule));
        }
        return "success";
      }

      if (event === "subscribe") {
        const welcomeRule = await replySvc.findWelcome();
        if (welcomeRule && replyContent(welcomeRule)) {
          return buildTextReply(openid, toUser, replyContent(welcomeRule));
        }
        const { welcomeReply } = await getExtraConfig();
        if (welcomeReply) {
          return buildTextReply(openid, toUser, welcomeReply);
        }
      }
      return "success";
    },
  };
};