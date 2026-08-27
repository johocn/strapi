/**
 * 渠道访问策略（Strapi v5 原生签名）
 * 检查用户是否有权访问指定渠道
 * 从请求参数/body/query 中提取 channelId
 * 返回 true/undefined 放行，返回 false 拒绝（403 PolicyError）
 */
const hasChannelAccess = async (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  const user = policyContext.state?.user;
  if (!user?.id) {
    return false;
  }

  // 注意：Strapi v5 的 createPolicyContext 用 Object.assign 复制 koa ctx，
  // ctx.query 是原型链 getter，不会复制为自有属性，故 policyContext.query 为 undefined；
  // 需经 policyContext.request.query（getter 访问）取查询参数。
  const rawId =
    config?.channelId ??
    policyContext.params?.channelId ??
    policyContext.params?.id ??
    policyContext.request?.body?.channelId ??
    policyContext.request?.query?.channel ??
    policyContext.query?.channel;

  const channelId = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  if (isNaN(channelId) || channelId <= 0) {
    return false;
  }

  try {
    const channelPermService = strapi.plugin("zhao-channel").service("channel-permission");
    const hasPermission = await channelPermService.checkUserChannelPermission(user.id, channelId);
    if (!hasPermission) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export default hasChannelAccess;
