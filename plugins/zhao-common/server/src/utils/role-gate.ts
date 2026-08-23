import type { Core } from "@strapi/strapi";

type Any = Record<string, any>;

export async function isRoleGateEnabled(strapi: Core.Strapi, siteDocId?: string): Promise<boolean> {
  try {
    const s = strapi.plugin("zhao-common")?.service("site-config");
    const full: Any = siteDocId
      ? await strapi.documents("plugin::zhao-common.site-config").findOne({ documentId: siteDocId })
      : await s?.getConfig(siteDocId);
    return full?.featureFlags?.roleGate === true;
  } catch {
    return false;
  }
}

export function mayAccessVisibleToRoles(userRoles: string[] | undefined, visibleToRoles: any): boolean {
  if (!Array.isArray(visibleToRoles) || visibleToRoles.length === 0) return true;
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;
  return visibleToRoles.some((r) => userRoles.includes(r));
}