export default async (ctx: any, next: any) => {
  const requestPath = ctx.path;
  if (ctx.method !== "GET") return next();
  if (requestPath.startsWith("/api/") || requestPath.startsWith("/admin")) return next();

  const siteId = ctx.state?.siteId;
  if (!siteId) return next();

  try {
    const redirectService = strapi.plugin("zhao-website").service("redirect");
    const match = await redirectService.match(siteId, requestPath);
    if (match) {
      ctx.status = match.statusCode;
      ctx.redirect(match.toUrl);
      return;
    }
  } catch (e) {
    // 重定向匹配失败不影响正常请求
  }
  return next();
};
