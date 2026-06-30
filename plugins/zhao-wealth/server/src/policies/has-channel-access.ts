'use strict';

export default async (ctx, config, { strapi }) => {
  const user = ctx.state.user;

  if (!user) {
    return false;
  }

  // 复用 zhao-auth 的渠道权限检查
  const channelId = ctx.state.channel?.id;

  if (!channelId) {
    strapi.log.warn('[zhao-wealth] 用户无渠道信息');
    return false;
  }

  return true;
};