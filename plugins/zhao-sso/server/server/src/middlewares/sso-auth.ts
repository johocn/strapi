export default async (ctx: any, next: any) => {
  const authHeader = ctx.request?.headers?.authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      try {
        const jwtService = (ctx as any).strapi?.plugin?.("zhao-sso")?.service?.("sso-jwt");
        if (jwtService) {
          const payload = await jwtService.verifyToken(parts[1]);
          if (payload.type === "access") {
            ctx.state.ssoUser = payload;
            ctx.state.ssoToken = parts[1];
          }
        }
      } catch { /* ignore */ }
    }
  }
  await next();
};
