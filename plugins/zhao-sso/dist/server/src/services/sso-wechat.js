"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const USER_UID = "plugin::zhao-sso.sso-user";
exports.default = ({ strapi }) => {
    const tokenCache = new Map();
    const ticketCache = new Map();
    function throwErr(code, status, message) {
        const e = new Error(message);
        e.code = code;
        e.status = status;
        throw e;
    }
    async function getConfig(appType) {
        const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
        const config = await configService.findByProviderAndAppType("wechat", appType);
        if (!config)
            throwErr("SSO_WECHAT_001", 500, `[zhao-sso] WeChat OAuth 配置未找到(请在后台配置 provider=wechat, appType=${appType})`);
        return config;
    }
    async function getValidAccessToken(config) {
        const cacheKey = config.appId.trim();
        const cached = tokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now() + 60000) {
            return cached.value;
        }
        const fetchToken = async () => {
            const res = await axios_1.default.get("https://api.weixin.qq.com/cgi-bin/token", {
                params: {
                    grant_type: "client_credential",
                    appid: config.appId.trim(),
                    secret: config.appSecret,
                },
            });
            return res.data || {};
        };
        let data = await fetchToken();
        if (data.errcode === 40001) {
            tokenCache.delete(cacheKey);
            data = await fetchToken();
        }
        if (data.errcode) {
            throwErr("SSO_WECHAT_010", 502, `WeChat token error: ${data.errmsg}`);
        }
        const expiresIn = data.expires_in || 7200;
        tokenCache.set(cacheKey, {
            value: data.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
        });
        return data.access_token;
    }
    async function getJsapiTicket(accessToken) {
        const cached = ticketCache.get(accessToken);
        if (cached && cached.expiresAt > Date.now() + 60000) {
            return cached.value;
        }
        const res = await axios_1.default.get("https://api.weixin.qq.com/cgi-bin/ticket/getticket", {
            params: { access_token: accessToken, type: "jsapi" },
        });
        const data = res.data || {};
        if (data.errcode) {
            throwErr("SSO_WECHAT_011", 502, `WeChat ticket error: ${data.errmsg}`);
        }
        const expiresIn = data.expires_in || 7200;
        ticketCache.set(accessToken, {
            value: data.ticket,
            expiresAt: Date.now() + expiresIn * 1000,
        });
        return data.ticket;
    }
    return {
        /**
         * 公开获取已缓存/刷新后的全局 access_token（复用闭包 tokenCache），供二维码/菜单等调用
         */
        async getAccessToken(appType = "official_account") {
            const config = await getConfig(appType);
            return getValidAccessToken(config);
        },
        /**
         * 使用调用方提供的 appId/appSecret 换取全局 access_token（复用 tokenCache）。
         * 供公众号动作从外部账号体系（如 zhao-studio publish-account.config）拿凭据时使用。
         */
        async getAccessTokenByConfig(config) {
            if (!(config === null || config === void 0 ? void 0 : config.appId))
                throwErr("SSO_WECHAT_002", 400, "[zhao-sso] 缺少公众号 appId");
            return getValidAccessToken(config);
        },
        async getAuthorizeUrl(state, appType, scope, callbackUrl) {
            const config = await getConfig(appType);
            const cleanAppId = config.appId.trim();
            if (appType === "mini_program") {
                return "";
            }
            if (appType === "open_platform") {
                const finalScope = scope || "snsapi_login";
                const params = new URLSearchParams({
                    appid: cleanAppId,
                    redirect_uri: callbackUrl || "",
                    response_type: "code",
                    scope: finalScope,
                    state,
                });
                return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
            }
            // official_account / app
            const finalScope = scope || "snsapi_userinfo";
            const params = new URLSearchParams({
                appid: cleanAppId,
                redirect_uri: callbackUrl || "",
                response_type: "code",
                scope: finalScope,
                state,
            });
            return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
        },
        async handleCallback(code, appType) {
            var _a, _b, _c, _d, _e;
            const config = await getConfig(appType);
            const cleanAppId = config.appId.trim();
            let openid;
            let unionid = null;
            let tokenData = {};
            let userInfo = null;
            if (appType === "mini_program") {
                const sessionRes = await axios_1.default.get("https://api.weixin.qq.com/sns/jscode2session", {
                    params: {
                        appid: cleanAppId,
                        secret: config.appSecret,
                        js_code: code,
                        grant_type: "authorization_code",
                    },
                });
                if (sessionRes.data.errcode) {
                    throwErr("SSO_WECHAT_004", 502, `WeChat jscode2session error: ${sessionRes.data.errmsg}`);
                }
                openid = sessionRes.data.openid;
                unionid = sessionRes.data.unionid || null;
                tokenData = sessionRes.data;
            }
            else {
                // official_account / open_platform / app
                const tokenRes = await axios_1.default.get("https://api.weixin.qq.com/sns/oauth2/access_token", {
                    params: {
                        appid: cleanAppId,
                        secret: config.appSecret,
                        code,
                        grant_type: "authorization_code",
                    },
                });
                if (tokenRes.data.errcode)
                    throwErr("SSO_WECHAT_003", 502, `WeChat OAuth error: ${tokenRes.data.errmsg}`);
                openid = tokenRes.data.openid;
                unionid = tokenRes.data.unionid || null;
                tokenData = tokenRes.data;
                const wxAccessToken = tokenRes.data.access_token;
                let userInfoRes = {};
                try {
                    userInfoRes = await axios_1.default.get("https://api.weixin.qq.com/sns/userinfo", {
                        params: { access_token: wxAccessToken, openid },
                    });
                }
                catch { /* ignore */ }
                userInfo = userInfoRes.data;
                // 静默授权（snsapi_base）sns/userinfo 无权限拿不到昵称头像：
                // 若用户已关注公众号，用用户管理接口 cgi-bin/user/info 兜底，静默注册/登录也能获得真实微信昵称（免二次弹窗）
                if (!(userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname)) {
                    try {
                        const mgr = await this.fetchWechatProfile(openid, appType);
                        if ((mgr === null || mgr === void 0 ? void 0 : mgr.subscribe) === 1 && (mgr === null || mgr === void 0 ? void 0 : mgr.nickname))
                            userInfo = mgr;
                    }
                    catch { /* 兜底失败静默：保持空昵称，后续 'n' 弹窗授权可回填 */ }
                }
            }
            // 优先 unionid 匹配已有用户（同一微信号跨不同 app 一致，避免重复建号）。
            // 注意：unionid 为空/未返回时必须跳过 unionid 匹配，否则空串可能误命中其它绑定，导致不同 openid 串到同一账号。
            // 空串时直接按 openid 精确匹配即可（openid 才是公众号下真实的唯一身份标识）。
            let binding = null;
            if (unionid) {
                binding = await strapi.db.query(BINDING_UID).findOne({
                    where: { provider: "wechat", provider_union_id: unionid },
                    populate: { user: true },
                });
            }
            if (!binding || !binding.user) {
                binding = await strapi.db.query(BINDING_UID).findOne({
                    where: { provider: "wechat", provider_user_id: openid },
                    populate: { user: true },
                });
            }
            if (binding) {
                // 孤儿绑定（关联的 sso_user 已被清理/删除）：删除绑定，走新用户注册流程，避免空引用
                if (!binding.user) {
                    await strapi.db.query(BINDING_UID).delete({ where: { id: binding.id } });
                }
                else {
                    // 同步最新微信资料：绑定表始终更新为最新；sso_user 仅回填缺昵称/头像（不覆盖用户手动设置过的昵称）
                    const hasWxNick = !!(userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname);
                    const hasWxAvatar = !!(userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl);
                    const backingUpdates = {};
                    if (hasWxNick)
                        backingUpdates.provider_nickname = userInfo.nickname;
                    if (hasWxAvatar)
                        backingUpdates.provider_avatar = userInfo.headimgurl;
                    if (Object.keys(backingUpdates).length) {
                        await strapi.db.query(BINDING_UID).update({ where: { id: binding.id }, data: backingUpdates });
                    }
                    if (hasWxNick && !binding.user.nickname) {
                        await strapi.db.query(USER_UID).update({
                            where: { id: binding.user.id },
                            data: { nickname: userInfo.nickname },
                        });
                    }
                    if (hasWxAvatar && !binding.user.avatar_url) {
                        await strapi.db.query(USER_UID).update({
                            where: { id: binding.user.id },
                            data: { avatar_url: userInfo.headimgurl },
                        });
                    }
                    // 补充关注状态（非关键路径，失败静默）
                    try {
                        const subscribe = await this.querySubscribe(openid, "wechat", appType);
                        await strapi.db.query(BINDING_UID).update({
                            where: { id: binding.id },
                            data: { subscribe, subscribe_at: new Date(), subscribe_check_at: new Date() },
                        });
                    }
                    catch { /* ignore */ }
                    // 老用户登录：确保 up_user 行存在（富字段对齐由 C 端 zhao-auth 懒对齐）
                    try {
                        const alignUp = strapi.service("plugin::zhao-sso.sso-user");
                        if (alignUp === null || alignUp === void 0 ? void 0 : alignUp.ensureUpUser) {
                            await alignUp.ensureUpUser(binding.user.id, {
                                username: binding.user.username,
                                email: null,
                                provider: "wechat",
                            });
                        }
                    }
                    catch { /* 对齐失败静默 */ }
                    // 老用户登录：补齐 up_users 的 sso_id/invite_code（与 sso_invite_codes 对齐，幂等）
                    try {
                        const knex = strapi.db.connection;
                        const inviteSvc = strapi.service("plugin::zhao-sso.sso-invite");
                        // 主观有码优先 vendure-youshop（主商城），无则 course 兜底 —— 与 /v1/user/me 返回的 ownInviteCode 优先级一致，保证四层同码
                        let ownCode = "";
                        if (inviteSvc) {
                            const q = strapi.db.query("plugin::zhao-sso.sso-invite-code");
                            const pref = await q.findOne({ where: { creator: binding.user.id, app_code: "vendure-youshop", is_active: true } }).catch(() => null);
                            const anyActive = pref || (await q.findOne({ where: { creator: binding.user.id, is_active: true } }).catch(() => null));
                            ownCode = (pref === null || pref === void 0 ? void 0 : pref.code) || (anyActive === null || anyActive === void 0 ? void 0 : anyActive.code) || "";
                            if (!ownCode)
                                ownCode = (await inviteSvc.ensureOwnInviteCode(binding.user.id, "vendure-youshop")) || "";
                        }
                        const patchUp = { sso_id: binding.user.id, updated_at: new Date() };
                        if (ownCode)
                            patchUp.invite_code = ownCode;
                        if (binding.user.nickname)
                            patchUp.nickname = binding.user.nickname;
                        await knex("up_users").where({ id: binding.user.id }).update(patchUp);
                    }
                    catch (e2) {
                        strapi.log.warn(`[zhao-sso] 老用户 up_users 富字段补齐失败 user=${binding.user.id}: ${e2 === null || e2 === void 0 ? void 0 : e2.message}`);
                    }
                    // 老用户登录：同步 zhao-channel 分销邀请（建立/刷新 D 层，externalInviteCode=SSO 自有码保证三码统一）
                    try {
                        const sync = strapi.service("plugin::zhao-sso.channel-sync");
                        if (sync === null || sync === void 0 ? void 0 : sync.getSync) {
                            const s = sync.getSync();
                            if (s === null || s === void 0 ? void 0 : s.syncUserInvite)
                                await s.syncUserInvite(binding.user.id);
                        }
                    }
                    catch { /* 同步失败静默 */ }
                    // 老用户登录：保证有 own 邀请码
                    try {
                        const alignInv = strapi.service("plugin::zhao-sso.sso-invite");
                        if (alignInv === null || alignInv === void 0 ? void 0 : alignInv.ensureOwnInviteCode)
                            await alignInv.ensureOwnInviteCode(binding.user.id, "course");
                    }
                    catch { /* 邀请码生成失败静默 */ }
                    return { userId: binding.user.id, isNew: false, ownInviteCode: (await ((_b = (_a = strapi.service("plugin::zhao-sso.sso-invite")) === null || _a === void 0 ? void 0 : _a.ensureOwnInviteCode) === null || _b === void 0 ? void 0 : _b.call(_a, binding.user.id, "course"))) || "" };
                }
            }
            // 生成用户名：wx_昵称前12位_8位uuid短码，保证唯一性且可读
            // 昵称清洗后若为空（如全为表情符号），用 wx_user 兜底
            const rawNickname = ((userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname) || "wx_user").replace(/[^\w\u4e00-\u9fa5]/g, "").substring(0, 12) || "wx_user";
            const shortId = (0, uuid_1.v4)().replace(/-/g, "").substring(0, 8);
            const username = `wx_${rawNickname}_${shortId}`;
            // 走序列失步守卫创建：主键冲突（备份恢复/显式ID合并导致序列落后）时自动同步并重试
            const userSvc = strapi.service("plugin::zhao-sso.sso-user");
            const user = await userSvc.createSsoUserWithSeqGuard({
                uuid: (0, uuid_1.v4)(),
                username,
                nickname: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname) || null,
                avatar_url: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl) || null,
                status: "active",
                login_count: 0,
                register_channel: `sso_wechat_${appType}`,
            });
            // 身份桥接：微信新用户同步补齐同 id 的 up_user，避免 up_users 与 sso_users 错位
            // 微信新用户自动生成专属邀请码（主商城 app 优先 vendure-youshop，无则 course 兜底），保证分销可传播
            const inviteSvc = strapi.service("plugin::zhao-sso.sso-invite");
            let ownInviteCode = "";
            try {
                const q = strapi.db.query("plugin::zhao-sso.sso-invite-code");
                const pref = await q.findOne({ where: { creator: user.id, app_code: "vendure-youshop", is_active: true } });
                const anyActive = pref || (await q.findOne({ where: { creator: user.id, is_active: true } }));
                ownInviteCode = (pref === null || pref === void 0 ? void 0 : pref.code) || (anyActive === null || anyActive === void 0 ? void 0 : anyActive.code) || "";
                if (!ownInviteCode)
                    ownInviteCode = ((await ((_c = inviteSvc === null || inviteSvc === void 0 ? void 0 : inviteSvc.ensureOwnInviteCode) === null || _c === void 0 ? void 0 : _c.call(inviteSvc, user.id, "vendure-youshop"))) || "");
            }
            catch {
                ownInviteCode = ((await ((_d = inviteSvc === null || inviteSvc === void 0 ? void 0 : inviteSvc.ensureOwnInviteCode) === null || _d === void 0 ? void 0 : _d.call(inviteSvc, user.id, "course"))) || "");
            }
            await ((_e = userSvc === null || userSvc === void 0 ? void 0 : userSvc.ensureUpUser) === null || _e === void 0 ? void 0 : _e.call(userSvc, user.id, {
                username,
                email: null,
                provider: "wechat",
            }));
            // 富字段对齐：把 sso_id/昵称/头像/真实专属邀请码直写 up_users（这些列并非 users-permissions schema 属性，
            // 用 knex 直写避免被 Strapi 过滤。此前依赖 C 端回调 syncSsoProfile/懒对齐，存在漏对齐，
            // 现改为注册时一次到位，确保 up_users 与 sso_users 严格对齐。）
            try {
                const knex = strapi.db.connection;
                const patch = { sso_id: user.id, updated_at: new Date() };
                if (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname)
                    patch.nickname = userInfo.nickname;
                if (userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl)
                    patch.avatar = userInfo.headimgurl;
                if (ownInviteCode)
                    patch.invite_code = ownInviteCode;
                await knex("up_users").where({ id: user.id }).update(patch);
            }
            catch (e2) {
                strapi.log.warn(`[zhao-sso] createUser 富字段对齐失败 user=${user.id}: ${e2 === null || e2 === void 0 ? void 0 : e2.message}`);
            }
            await strapi.db.query(BINDING_UID).create({
                data: {
                    user: { id: user.id },
                    provider: "wechat",
                    provider_user_id: openid,
                    provider_union_id: unionid,
                    provider_nickname: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.nickname) || null,
                    provider_avatar: (userInfo === null || userInfo === void 0 ? void 0 : userInfo.headimgurl) || null,
                    provider_data: tokenData,
                    bound_at: new Date(),
                },
            });
            // 补充关注状态（非关键路径，失败静默）
            try {
                const subscribe = await this.querySubscribe(openid, "wechat", appType);
                await strapi.db.query(BINDING_UID).update({
                    where: { provider_user_id: openid },
                    data: { subscribe, subscribe_at: new Date(), subscribe_check_at: new Date() },
                });
            }
            catch { /* ignore */ }
            // 新用户注册：同步 zhao-channel 分销邀请（建立 D 层，externalInviteCode=SSO 自有码保证三码统一）
            try {
                const sync = strapi.service("plugin::zhao-sso.channel-sync");
                if (sync === null || sync === void 0 ? void 0 : sync.getSync) {
                    const s = sync.getSync();
                    if (s === null || s === void 0 ? void 0 : s.syncUserInvite)
                        await s.syncUserInvite(user.id);
                }
            }
            catch { /* 同步失败静默 */ }
            // 微信新用户注册后返回 ownInviteCode，供 C 端 user 对齐写入
            return { userId: user.id, isNew: true, ownInviteCode };
        },
        async getJssdkSignature(url, appType) {
            const config = await getConfig(appType);
            const accessToken = await getValidAccessToken(config);
            const ticket = await getJsapiTicket(accessToken);
            const nonceStr = (0, uuid_1.v4)().replace(/-/g, "").substring(0, 16);
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
            const signature = crypto_1.default.createHash("sha1").update(raw).digest("hex");
            return {
                appId: config.appId.trim(),
                timestamp,
                nonceStr,
                signature,
            };
        },
        async getWechatLoginConfig(appType) {
            var _a;
            const configService = strapi.plugin("zhao-sso").service("sso-oauth-config");
            const config = await configService.findByProviderAndAppType("wechat", appType);
            if (!config) {
                return { enabled: false, appType, oauthScopes: [], appId: null };
            }
            return {
                enabled: true,
                appType,
                oauthScopes: ((_a = config.extraConfig) === null || _a === void 0 ? void 0 : _a.oauthScopes) || ["snsapi_userinfo"],
                appId: config.appId,
            };
        },
        /**
         * 拉取公众号用户完整资料（cgi-bin/user/info，全局基础 access_token）。
         * 仅已关注用户返回 nickname/headimgurl；未关注返回 subscribe=0 无资料。
         */
        async fetchWechatProfile(openid, appType = "official_account") {
            const config = await getConfig(appType);
            const accessToken = await getValidAccessToken(config);
            const res = await axios_1.default.get("https://api.weixin.qq.com/cgi-bin/user/info", {
                params: { access_token: accessToken, openid },
                timeout: 10000,
            });
            return res.data || {};
        },
        /**
         * 查询用户是否关注公众号(subscribe)
         * 调 cgi-bin/user/info + 全局 access_token，返回 subscribe(1关注/0未关注)
         */
        async querySubscribe(openid, provider = "wechat", appType = "official_account") {
            if (provider !== "wechat")
                return 0;
            if (process.env.MSG_WECHAT_PROVIDER === "mock")
                return 1; // mock 模式视为已关注，便于联调
            const data = await this.fetchWechatProfile(openid, appType);
            if (data.errcode) {
                throwErr("SSO_WECHAT_012", 502, `WeChat user info error: ${data.errmsg}`);
            }
            return data.subscribe === 1 ? 1 : 0;
        },
    };
};
//# sourceMappingURL=sso-wechat.js.map