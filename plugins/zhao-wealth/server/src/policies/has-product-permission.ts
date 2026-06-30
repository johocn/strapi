'use strict';

export default async (ctx, config, { strapi }) => {
  const user = ctx.state.user;

  if (!user) {
    return false;
  }

  // 检查管理员权限
  const role = user.role?.type;

  if (role === 'admin') {
    return true;
  }

  // 渠道管理员检查
  const channelId = ctx.state.channel?.id;

  if (role === 'channel-admin' && channelId) {
    return true;
  }

  return false;
};