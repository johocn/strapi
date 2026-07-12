import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-website.brand-voice";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // ===== 查询 =====
  async findAdmin(siteId: number | null, query: any = {}) {
    const { category, status, page = 1, pageSize = 20 } = query;
    const filters: any = {
      $or: [
        { site: siteId, deletedAt: null },
        { site: null, deletedAt: null },
      ],
    };
    if (category) {
      filters.$or[0].category = category;
      filters.$or[1].category = category;
    }
    if (status !== undefined) {
      filters.$or[0].status = status;
      filters.$or[1].status = status;
    }
    return strapi.db.query(UID).findMany({
      where: filters,
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      orderBy: { updatedAt: "DESC" },
    });
  },

  async findOneAdmin(siteId: number | null, documentId: string) {
    // 两步查询：租户优先，全局 fallback
    const tenant = await strapi.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
    });
    if (tenant) return tenant;
    return strapi.db.query(UID).findOne({
      where: { site: null, documentId, deletedAt: null },
    });
  },

  // ===== 写入 =====
  async create(siteId: number | null, data: any) {
    return strapi.db.query(UID).create({
      data: { ...data, site: siteId },
    });
  },

  async update(siteId: number | null, documentId: string, data: any) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw new Error("Brand voice not found");
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data,
    });
  },

  async softDelete(siteId: number | null, documentId: string) {
    const existing = await this.findOneAdmin(siteId, documentId);
    if (!existing) throw new Error("Brand voice not found");
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
  },

  // ===== 类目查询 =====
  async listByCategory(siteId: number | null, category: string) {
    return strapi.db.query(UID).findMany({
      where: {
        $or: [
          { site: siteId, category, status: true, deletedAt: null },
          { site: null, category, status: true, deletedAt: null },
        ],
      },
      orderBy: { name: "ASC" },
    });
  },

  // ===== 变量替换 =====
  async resolveVariables(siteId: number | null, documentId: string, variables: Record<string, string>) {
    const voice = await this.findOneAdmin(siteId, documentId);
    if (!voice) throw new Error("Brand voice not found");

    let content = voice.content || "";
    const varDefs: Array<{ name: string; defaultValue?: string }> = voice.variables || [];

    for (const v of varDefs) {
      const value = variables[v.name] ?? v.defaultValue ?? `{{${v.name}}}`;
      content = content.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, "g"), value);
    }

    return content;
  },

  // ===== 参考内容 =====
  async getRefContent(siteId: number | null, category: string) {
    const voices = await strapi.db.query(UID).findMany({
      where: {
        $or: [
          { site: siteId, category, status: true, deletedAt: null },
          { site: null, category, status: true, deletedAt: null },
        ],
      },
      orderBy: { name: "ASC" },
    });
    return voices.map((v: any) => `- ${v.name}: ${v.content}`).join("\n");
  },
});