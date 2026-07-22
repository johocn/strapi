// server/src/services/permission-check.service.ts
import type { Core } from "@strapi/strapi";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkPermission(
    userId: number,
    action: string,
    tenantDocumentId?: string
  ): Promise<{ allowed: boolean; reasons: string[] }> {
    const reasons: string[] = [];
    const result = await strapi
      .plugin("zhao-auth")
      .service("permission")
      .getMyPermissions(userId, tenantDocumentId);

    // 兼容 permission.service.getMyPermissions 返回 { permissions: string[] } 或 string[]
    const permissions: string[] = Array.isArray(result)
      ? result
      : (result?.permissions ?? []);

    if (permissions.includes(action)) {
      return { allowed: true, reasons: ["Permission granted"] };
    }

    reasons.push(`Action "${action}" not in user's permissions`);
    reasons.push(`User has ${permissions.length} permissions`);

    return { allowed: false, reasons };
  },
});
