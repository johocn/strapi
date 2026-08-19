/**
 * 考试/试卷角色门控共用逻辑：
 * - 读取用户 zhaoRoles 角色码白名单（quiz.examRoles）
 * - admin 恒放行；白名单空=不启用角色门控=放行
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

/** 从关联课程 featureFlags（JSON 对象/字符串）解析 quiz.examRoles */
export function parseQuizExamRoles(course: any): string[] {
  let ff: any = course?.featureFlags;
  if (typeof ff === "string") {
    try {
      ff = JSON.parse(ff);
    } catch {
      return [];
    }
  }
  if (!ff || typeof ff !== "object" || Array.isArray(ff)) return [];
  const quiz = (ff as any).quiz;
  if (!quiz || typeof quiz !== "object" || Array.isArray(quiz)) return [];
  const er = (quiz as any).examRoles;
  if (!Array.isArray(er)) return [];
  return er.filter((x: any) => typeof x === "string");
}