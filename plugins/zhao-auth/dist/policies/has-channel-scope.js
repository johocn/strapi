"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 渠道范围策略（Strapi 原生签名，非阻断）
 * 解析用户可见渠道范围，注入 policyContext.state.channelScope
 */
const hasChannelScope = async (policyContext, config, { strapi }) => {
    let user = policyContext.state?.user;
    // 如果没有用户信息，尝试从请求头解析 token
    if (!user?.id && policyContext.request?.headers?.authorization) {
        try {
            const authHeader = policyContext.request.headers.authorization;
            const token = authHeader.replace("Bearer ", "");
            // 使用 jwt 直接解码
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            if (decoded?.id) {
                user = await strapi.entityService.findOne("plugin::users-permissions.user", decoded.id, {
                    fields: ["id", "username", "email", "zhaoRoles"],
                });
            }
        }
        catch (err) {
            strapi.log.error(`[has-channel-scope] 解析 token 失败: ${err.message}`);
        }
    }
    if (!user?.id) {
        policyContext.state.channelScope = { all: false, channelIds: [], isGuest: true };
        return true;
    }
    try {
        const channelScopeService = strapi.plugin("zhao-auth").service("channel-scope");
        const scope = await channelScopeService.resolve(user);
        policyContext.state.channelScope = scope;
    }
    catch (err) {
        strapi.log.error(`[has-channel-scope] 错误: ${err.message}`);
        policyContext.state.channelScope = { all: false, channelIds: [], isGuest: false };
    }
    return true;
};
exports.default = hasChannelScope;
