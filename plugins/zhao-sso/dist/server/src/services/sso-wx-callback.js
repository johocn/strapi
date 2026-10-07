"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const wechat_xml_1 = require("../utils/wechat-xml");
const EVENT_UID = "plugin::zhao-sso.sso-wx-event";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
exports.default = ({ strapi }) => {
    /**
     * 读取公众号服务器配置（注入 sso-oauth-config(wechat/official_account).extra_config）
     */
    async function getExtraConfig() {
        var _a, _b;
        const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
        const config = await configService.findByProviderAndAppType("wechat", "official_account");
        return {
            serverToken: ((_a = config === null || config === void 0 ? void 0 : config.extraConfig) === null || _a === void 0 ? void 0 : _a.serverToken) || "",
            welcomeReply: ((_b = config === null || config === void 0 ? void 0 : config.extraConfig) === null || _b === void 0 ? void 0 : _b.welcomeReply) || "",
        };
    }
    /**
     * 微信回调验签：sha1(sort([token,timestamp,nonce]).join("")) === signature
     */
    async function verifySignature(params) {
        const { timestamp, nonce, signature } = params;
        if (!timestamp || !nonce || !signature)
            return false;
        const { serverToken } = await getExtraConfig();
        if (!serverToken)
            return false;
        const sorted = [serverToken, String(timestamp), String(nonce)].sort().join("");
        const hash = crypto_1.default.createHash("sha1").update(sorted).digest("hex");
        return hash === signature;
    }
    /**
     * 组装被动文本回复 XML（text 事件命中关键字/fallback，subscribe 命中 welcome）
     * article 类型规则被动回复不支持图文，仅回提示文本
     */
    function buildTextReply(openid, toUser, content) {
        return (0, wechat_xml_1.buildXml)({
            ToUserName: openid,
            FromUserName: toUser,
            CreateTime: Math.floor(Date.now() / 1000),
            MsgType: "text",
            Content: content,
        });
    }
    function cdata(v) {
        if (v === undefined || v === null || v === "")
            return "";
        return typeof v === "number" ? String(v) : `<![CDATA[${String(v)}]]>`;
    }
    /** 规则是否可用（按类型校验必填字段） */
    function ruleUsable(rule) {
        const t = rule.reply_type || "text";
        if (t === "text")
            return !!rule.text;
        if (t === "image" || t === "voice" || t === "video")
            return !!rule.media_id;
        if (t === "music")
            return !!(rule.title && rule.music_url);
        if (t === "news" || t === "article")
            return !!(Array.isArray(rule.articles) && rule.articles.length) || !!rule.title;
        if (t === "transfer")
            return true;
        return false;
    }
    /** 按回复类型组装被动回复 XML（text/image/voice/video/music/news/transfer） */
    function buildReplyXml(rule, openid, toUser) {
        const type = rule.reply_type || "text";
        const head = () => `<ToUserName>${cdata(openid)}</ToUserName><FromUserName>${cdata(toUser)}</FromUserName><CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>`;
        switch (type) {
            case "image":
                return `<xml>${head()}<MsgType><![CDATA[image]]></MsgType><Image><MediaId>${cdata(rule.media_id)}</MediaId></Image></xml>`;
            case "voice":
                return `<xml>${head()}<MsgType><![CDATA[voice]]></MsgType><Voice><MediaId>${cdata(rule.media_id)}</MediaId></Voice></xml>`;
            case "video":
                return (`<xml>${head()}<MsgType><![CDATA[video]]></MsgType><Video><MediaId>${cdata(rule.media_id)}</MediaId>` +
                    (rule.title ? `<Title>${cdata(rule.title)}</Title>` : "") +
                    (rule.desc ? `<Description>${cdata(rule.desc)}</Description>` : "") +
                    `</Video></xml>`);
            case "music":
                return (`<xml>${head()}<MsgType><![CDATA[music]]></MsgType><Music>` +
                    `<Title>${cdata(rule.title)}</Title><Description>${cdata(rule.desc)}</Description>` +
                    `<MusicUrl>${cdata(rule.music_url)}</MusicUrl>` +
                    (rule.hq_music_url ? `<HQMusicUrl>${cdata(rule.hq_music_url)}</HQMusicUrl>` : "") +
                    (rule.thumb_media_id ? `<ThumbMediaId>${cdata(rule.thumb_media_id)}</ThumbMediaId>` : "") +
                    `</Music></xml>`);
            case "news":
            case "article": {
                // 多图文（最多 8 条）；旧 article 无 articles 数组时降级为单条
                let articles = Array.isArray(rule.articles) && rule.articles.length
                    ? rule.articles.slice(0, 8)
                    : rule.title
                        ? [{ title: rule.title, description: rule.desc, pic_url: rule.pic_url, url: rule.link_url }]
                        : [];
                const items = articles
                    .map((a) => {
                    let s = "<item>";
                    if (a.title)
                        s += `<Title>${cdata(a.title)}</Title>`;
                    if (a.description)
                        s += `<Description>${cdata(a.description)}</Description>`;
                    if (a.pic_url)
                        s += `<PicUrl>${cdata(a.pic_url)}</PicUrl>`;
                    if (a.url)
                        s += `<Url>${cdata(a.url)}</Url>`;
                    s += "</item>";
                    return s;
                })
                    .join("");
                return `<xml>${head()}<MsgType><![CDATA[news]]></MsgType><ArticleCount>${articles.length}</ArticleCount><Articles>${items}</Articles></xml>`;
            }
            case "transfer":
                return `<xml>${head()}<MsgType><![CDATA[transfer_customer_service]]></MsgType></xml>`;
            default:
                return buildTextReply(openid, toUser, rule.text || "");
        }
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
        async handleAdminMessageReply(openid, messageId, reply) {
            var _a, _b, _c;
            try {
                const ssoPlug = strapi.plugin("zhao-sso");
                const sop = ssoPlug === null || ssoPlug === void 0 ? void 0 : ssoPlug.service("sso-sop");
                const admins = sop && typeof sop.adminNotifyUsers === "function" ? sop.adminNotifyUsers() : [];
                if (!admins || admins.length === 0)
                    return "unauthorized";
                const binding = await strapi.db.query(BINDING_UID).findOne({
                    where: { provider: "wechat", provider_user_id: openid },
                    populate: { user: true },
                });
                const ssoUserId = (_b = (_a = binding === null || binding === void 0 ? void 0 : binding.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : binding === null || binding === void 0 ? void 0 : binding.user;
                if (!ssoUserId || !admins.includes(Number(ssoUserId)))
                    return "unauthorized";
                const zpSvc = (_c = strapi.plugin("zhao-point")) === null || _c === void 0 ? void 0 : _c.service("activity");
                if (!zpSvc || typeof zpSvc.replyMessageByWechat !== "function")
                    return "unauthorized";
                await zpSvc.replyMessageByWechat({ messageId, reply });
                return "ok";
            }
            catch (e) {
                strapi.log.warn(`[zhao-sso:wx-callback] handleAdminMessageReply failed: ${e.message}`);
                throw e;
            }
        },
        /**
         * 处理微信推送消息/事件（验签由 controller 层完成，此处只做业务分发与落库）
         * 返回被动回复内容（关注+配置了欢迎语返回文本 XML，否则返回微信认可的 success）
         */
        async handleXml(xml) {
            const msg = (0, wechat_xml_1.parseXml)(xml);
            const openid = msg.FromUserName || "";
            const toUser = msg.ToUserName || "";
            const msgType = msg.MsgType || "";
            const eventName = msg.Event || "";
            // 事件归类
            let event = "other";
            let eventKey = null;
            let sceneKey = null;
            if (msgType === "event") {
                if (eventName === "subscribe") {
                    event = "subscribe";
                    if ((msg.EventKey || "").startsWith("qrscene_")) {
                        sceneKey = msg.EventKey.slice("qrscene_".length) || null;
                    }
                }
                else if (eventName === "unsubscribe") {
                    event = "unsubscribe";
                }
                else if (eventName === "SCAN") {
                    event = "SCAN";
                    sceneKey = msg.EventKey || null;
                }
                else if (eventName === "CLICK") {
                    event = "CLICK";
                    eventKey = msg.EventKey || null;
                }
            }
            else if (msgType === "text") {
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
                }
                else if (event === "unsubscribe") {
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
                        if (status === "ok")
                            return buildTextReply(openid, toUser, "已提交回复");
                        if (status === "unauthorized")
                            return buildTextReply(openid, toUser, "无回复权限");
                        return buildTextReply(openid, toUser, "留言不存在或已回复");
                    }
                    catch (e) {
                        strapi.log.warn(`[zhao-sso:wx-callback] message reply parse failed: ${e.message}`);
                        return "success";
                    }
                }
                const rule = await replySvc.matchText(text);
                if (rule && ruleUsable(rule)) {
                    return buildReplyXml(rule, openid, toUser);
                }
                return "success";
            }
            if (event === "subscribe") {
                const welcomeRule = await replySvc.findWelcome();
                if (welcomeRule && ruleUsable(welcomeRule)) {
                    return buildReplyXml(welcomeRule, openid, toUser);
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
//# sourceMappingURL=sso-wx-callback.js.map