import type { Core } from "@strapi/strapi";

const wrap = (data: any, meta: any = {}) => ({ data, meta });

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async join(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      ctx.status = 401;
      ctx.body = { error: "未认证", code: "UNAUTHORIZED" };
      return;
    }

    const body = ctx.request.body?.data || ctx.request.body;
    const { inviteCode } = body;

    if (!inviteCode) {
      ctx.status = 400;
      ctx.body = { error: "请提供渠道邀请码" };
      return;
    }

    try {
      const channelMemberService = strapi.plugin("zhao-channel").service("channel-member");
      const result = await channelMemberService.joinByInvite(userId, inviteCode);

      ctx.body = {
        success: true,
        message: "已成功加入渠道",
        data: {
          channelId: result.channelId,
          channelName: result.channelName,
          role: result.role,
          isNewMember: result.isNewMember,
        },
      };
    } catch (e: any) {
      ctx.status = e.status || 400;
      ctx.body = { error: e.message, code: e.code };
    }
  },
});