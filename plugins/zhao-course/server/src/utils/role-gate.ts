/**
 * 课程/考试角色门控共用逻辑：
 * - 读取用户 zhaoRoles 角色码（白名单）
 * - admin 恒放行；白名单空=不启用角色门控=放行
 * - 从 featureFlags（JSON 对象/字符串均可）解析 learnRoles
 */

export async function resolveUserRoles(strapi: any, userId?: number): Promise<string[]> {
  if (!userId) return [];
  const user: any = await strapi.db
    .query("plugin::users-permissions.user")
    .findOne({ where: { id: userId } });
  const raw = Array.isArray(user?.zhaoRoles) ? user.zhaoRoles : [];
  return raw.filter((r: any) => typeof r === "string");
}

export function hasGrantedRole(userRoles: string[], whitelist: string[]): boolean {
  if (!Array.isArray(whitelist) || whitelist.length === 0) return true;
  const roles = Array.isArray(userRoles) ? userRoles : [];
  if (roles.includes("admin")) return true;
  return roles.some((r) => whitelist.includes(r));
}

/** 从 featureFlags（文档 API 返回对象 / db.query 返回 JSON 字符串）提取 learnRoles */
export function parseLearnRoles(featureFlags: any): string[] {
  let ff: any = featureFlags;
  if (typeof ff === "string") {
    try {
      ff = JSON.parse(ff);
    } catch {
      return [];
    }
  }
  if (!ff || typeof ff !== "object" || Array.isArray(ff)) return [];
  const learn = (ff as any).learnRoles;
  if (!Array.isArray(learn)) return [];
  return learn.filter((x: any) => typeof x === "string");
}