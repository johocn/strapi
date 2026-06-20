/**
 * 渠道范围策略（Strapi 原生签名，非阻断）
 * 解析用户可见渠道范围，注入 policyContext.state.channelScope
 */
const hasChannelScope = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  let user = policyContext.state?.user;

  // 如果没有用户信息，尝试从请求头解析 token
  if (!user?.id && policyContext.request?.headers?.authorization) {
    try {
      const authHeader = policyContext.request.headers.authorization;
      const token = authHeader.replace("Bearer ", "");
      
      // 使用 jwt 直接解码
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      
      strapi.log.debug(`[has-channel-scope] token decoded: ${JSON.stringify(decoded)}`);
      
      if (decoded?.id) {
        user = await strapi.entityService.findOne("plugin::users-permissions.user", decoded.id, {
          fields: ["id", "username", "email", "zhaoRoles"],
        });
        strapi.log.debug(`[has-channel-scope] 用户查询成功: ${user?.id}`);
      }
    } catch (err) {
      strapi.log.error(`[has-channel-scope] 解析 token 失败: ${err.message}`);
    }
  }

  strapi.log.info(`[has-channel-scope] userId=${user?.id}, hasUser=${!!user}`);

  if (!user?.id) {
    policyContext.state.channelScope = { all: false, channelIds: [], isGuest: true };
    strapi.log.info(`[has-channel-scope] 游客访问，设置 channelScope: guest`);
    return true;
  }

  try {
    const channelScopeService = strapi.plugin("zhao-auth").service("channel-scope");
    strapi.log.info(`[has-channel-scope] 调用 channelScopeService.resolve`);
    const scope = await channelScopeService.resolve(user);
    policyContext.state.channelScope = scope;
    strapi.log.info(`[has-channel-scope] 返回 scope: all=${scope.all}, channelIds=${JSON.stringify(scope.channelIds)}`);
  } catch (err) {
    strapi.log.error(`[has-channel-scope] 错误: ${err.message}`);
    policyContext.state.channelScope = { all: false, channelIds: [], isGuest: false };
  }

  return true;
};

export default hasChannelScope;
