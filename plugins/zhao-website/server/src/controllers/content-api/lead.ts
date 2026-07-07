export default {
  async submit(ctx: any) {
    const siteId = ctx.state.siteId;
    // honeypot 检测
    if (ctx.request.body.website) {
      // honeypot 字段被填 → 静默成功（迷惑爬虫）
      return ctx.body = { success: true };
    }
    const { type = "contact" } = ctx.request.body;
    const lead = await strapi.plugin("zhao-website").service("lead").createPublic(siteId, {
      ...ctx.request.body,
      type,
      ipAddress: ctx.request.ip,
      userAgent: ctx.request.headers["user-agent"],
      referrer: ctx.request.headers.referer,
      status: "new",
    }, ctx);
    ctx.body = { success: true, id: lead.documentId };
  },

  async track(ctx: any) {
    const siteId = ctx.state.siteId;
    const { type, targetType, targetId, visitorId, userId } = ctx.request.body;

    // 必填校验
    if (!type || !targetType || !targetId || !visitorId) {
      return ctx.badRequest("Missing required fields: type, targetType, targetId, visitorId");
    }

    try {
      const result = await strapi.plugin("zhao-website").service("interaction").toggle(siteId, {
        type,
        targetType,
        targetId,
        visitorId,
        userId,
        ctx, // service 内部用 ctx.request.ip / userAgent
      });
      ctx.body = { success: true, action: result.action };
    } catch (err) {
      ctx.status = (err as any).status || 500;
      ctx.body = { error: (err as Error).message };
    }
  },
};
