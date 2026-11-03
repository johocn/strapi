import jwt from "jsonwebtoken";

const FULL_ACCESS_ROLES = ["strapi-super-admin", "tire-admin"];
const WAREHOUSE_ROLE = "tire-warehouse";
const WAREHOUSE_ALLOWED = ["read", "storage"];

const deny = (ctx: any, status: 401 | 403) => {
  const code = status === 401 ? "UNAUTHORIZED" : "FORBIDDEN";
  const message = status === 401 ? "未登录或登录已过期" : "无后台访问权限";
  const payload = JSON.stringify({ code, message });

  // 直接写回响应，避免 Strapi 默认错误体覆盖 { code } 结构
  try {
    ctx.status = status;
    ctx.body = { code, message };
    ctx.respond = false;
    ctx.res.statusCode = status;
    ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
    ctx.res.end(payload);
  } catch {
    // 响应已结束时忽略
  }

  return false;
};

export default async (
  ctx: any,
  policyConfig: any = {},
  { strapi }: { strapi: any }
) => {
  const header = String(ctx.request?.headers?.authorization || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return deny(ctx, 401);

  const token = match[1].trim();
  if (!token) return deny(ctx, 401);

  let decoded: any;
  try {
    const secret = strapi.config.get("admin.auth.secret");
    if (!secret) return deny(ctx, 401);
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return deny(ctx, 401);
  }

  // 核心 admin 会话 token 使用 userId（字符串），自签调试 token 使用 id，两者兼容
  const userId = Number(decoded?.id ?? decoded?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return deny(ctx, 401);

  const user = await strapi.db.query("admin::user").findOne({
    where: { id: userId },
    populate: ["roles"],
  });
  if (!user) return deny(ctx, 401);

  const roleCodes: string[] = (user.roles || [])
    .map((role: any) => String(role?.code || ""))
    .filter(Boolean);

  const allow = String(policyConfig?.allow ?? "");

  ctx.state.user = user;
  ctx.state.adminUser = user;

  if (roleCodes.some((code) => FULL_ACCESS_ROLES.includes(code))) {
    return true;
  }

  if (
    roleCodes.includes(WAREHOUSE_ROLE) &&
    WAREHOUSE_ALLOWED.includes(allow)
  ) {
    return true;
  }

  return deny(ctx, 403);
};
