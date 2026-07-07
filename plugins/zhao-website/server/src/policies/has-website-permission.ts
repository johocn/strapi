export default (config: { action?: string }) => {
  return async (ctx: any, next: any) => {
    const user = ctx.state?.user || ctx.state?.auth?.credentials;
    if (!user) {
      return ctx.throw(401, "未认证");
    }
    const action = config?.action;
    if (!action) {
      return await next();
    }
    const authService = strapi.plugin("zhao-auth").service("auth");
    const hasPermission = await authService.checkPermission(user, action);
    if (!hasPermission) {
      return ctx.throw(403, `需要 ${action} 权限`);
    }
    await next();
  };
};
