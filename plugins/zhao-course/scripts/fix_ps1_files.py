import os

root = r"e:\code\plugins\zhao-quiz"

files = {}

# ===== has-permission.ts =====
files[r"server\src\policies\has-permission.ts"] = '''import type { Core } from "@strapi/strapi";
import { PERMISSIONS } from "../permissions";

export interface PolicyResult {
  passed: boolean;
  code?: string;
  message?: string;
}

export type PolicyHandler = (
  context: Record<string, unknown>,
  config?: Record<string, unknown>,
) => Promise<PolicyResult> | PolicyResult;

const createHasPermission = (strapi: Core.Strapi): PolicyHandler => {
  return (context, config): PolicyResult => {
    const user = context?.user as Record<string, unknown> | undefined;
    if (!user || !user.id) {
      return { passed: false, code: "UNAUTHENTICATED", message: "未认证，请先登录" };
    }
    const action = config?.action as string | undefined;
    if (!action) {
      return { passed: false, code: "MISSING_ACTION", message: "未指定权限动作" };
    }
    const permission = PERMISSIONS[action as keyof typeof PERMISSIONS];
    if (!permission) {
      strapi.log.warn(`[zhao-quiz] \u672a\u5b9a\u4e49\u7684\u6743\u9650\u52a8\u4f5c: ${action}`);
      return { passed: false, code: "PERMISSION_NOT_FOUND", message: `权限动作 "${action}" 未定义` };
    }
    const userRoles = (user.roles as string[]) || [];
    if (userRoles.length === 0) {
      return { passed: false, code: "NO_ROLES", message: "用户无角色信息" };
    }
    const hasPermission = permission.allowRoles.some((role) => userRoles.includes(role));
    if (!hasPermission) {
      return { passed: false, code: "FORBIDDEN", message: `无权执行操作 "${action}"` };
    }
    return { passed: true };
  };
};

export default createHasPermission;
'''

# ===== permissions.ts =====
files[r"server\src\permissions.ts"] = '''export const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export interface PermissionEntry {
  allowRoles: string[];
}

export type PermissionAction = `${string}.${"read" | "create" | "update" | "delete"}`;

export const PERMISSIONS: Record<PermissionAction, PermissionEntry> = {
  "quiz.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "quiz.create": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz.update": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz.delete": { allowRoles: ["super-admin", "admin"] },
  "quiz-record.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "quiz-record.create": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz-record.update": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz-record.delete": { allowRoles: ["super-admin", "admin"] },
  "quiz-exam.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "quiz-exam.create": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz-exam.update": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz-exam.delete": { allowRoles: ["super-admin", "admin"] },
  "quiz-exam-attempt.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "quiz-exam-attempt.delete": { allowRoles: ["super-admin", "admin"] },
  "quiz-batch.read": { allowRoles: ["super-admin", "admin", "editor", "viewer"] },
  "quiz-batch.create": { allowRoles: ["super-admin", "admin", "editor"] },
  "quiz-batch.delete": { allowRoles: ["super-admin", "admin"] },
};
'''

# Write all files
for rel_path, content in files.items():
    full_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Created: {rel_path}")

print("Done! All files written successfully.")
