export default {
  /**
   * 邀请码流转埋点上报（公开、无需登录）。只记录，不进业务有副作用。
   */
  async track(ctx: any) {
    const body = ctx.request?.body ?? {};
    const data = { ...body };

    if (!data.event) {
      return ctx.badRequest("Missing event");
    }

    const userId = data.userId ?? ctx.state?.user?.id ?? null;
    const record = {
      event: String(data.event),
      inviteCode: data.inviteCode || null,
      storedCode: data.storedCode || null,
      channelInviteCode: data.channelInviteCode || null,
      inviterId: data.inviterId != null ? String(data.inviterId) : null,
      targetType: data.targetType || null,
      targetId: data.targetId != null ? String(data.targetId) : null,
      pagePath: data.pagePath || null,
      loggedIn: data.loggedIn != null ? !!data.loggedIn : false,
      success: data.success != null ? !!data.success : true,
      detail: data.detail != null ? String(data.detail) : null,
      sessionId: data.sessionId || null,
      visitorId: data.visitorId || null,
      ipAddress: ctx.request?.ip,
      userAgent: ctx.request?.headers?.["user-agent"],
      userId,
    };

    await strapi.plugin("zhao-website").service("invite-trace").createPublic(record);

    return ctx.body = { ok: true };
  },
};