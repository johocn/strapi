export default {
  /**
   * GET /v1/customer-profile — 查询当前用户客户档案（需登录）
   */
  async getMyProfile(ctx: any) {
    const siteId = ctx.state.siteId;
    const user = ctx.state.user;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!user?.id) return ctx.unauthorized("请先登录");

    // 简化：按用户手机号匹配（实际可扩展为 customer-profile.userId 关联字段）
    // 此处返回空数据占位，实际匹配逻辑视业务扩展
    ctx.body = { data: null, message: "请通过手机号关联客户档案" };
  },
};
