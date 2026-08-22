import type { Core } from "@strapi/strapi";

const REPLY_UID = "plugin::zhao-sso.sso-wx-reply";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  async function list(filters: { page?: number; pageSize?: number; trigger?: string; match?: string } = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 20);
    const where: Record<string, any> = {};
    if (filters.trigger) where.trigger = filters.trigger;
    if (filters.match) where.match = { $contains: filters.match };
    const rows = await strapi.db.query(REPLY_UID).findMany({
      where,
      orderBy: { sort: "asc", createdAt: "asc" },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    const total = await strapi.db.query(REPLY_UID).count({ where });
    return { data: rows, meta: { pagination: { page, pageSize, total } } };
  }

  async function findOne(id: number) {
    const row = await strapi.db.query(REPLY_UID).findOne({ where: { id } });
    if (!row) throwErr("SSO_WX_REPLY_404", 404, "回复规则不存在");
    return row;
  }

  async function create(data: {
    trigger?: string;
    match?: string;
    reply_type?: string;
    text?: string;
    title?: string;
    desc?: string;
    pic_url?: string;
    link_url?: string;
    sort?: number;
    enabled?: boolean;
  }) {
    return strapi.db.query(REPLY_UID).create({
      data: {
        trigger: data.trigger || "keyword",
        match: data.match !== undefined ? data.match : null,
        reply_type: data.reply_type || "text",
        text: data.text !== undefined ? data.text : null,
        title: data.title !== undefined ? data.title : null,
        desc: data.desc !== undefined ? data.desc : null,
        pic_url: data.pic_url !== undefined ? data.pic_url : null,
        link_url: data.link_url !== undefined ? data.link_url : null,
        sort: data.sort !== undefined ? data.sort : 0,
        enabled: data.enabled !== undefined ? data.enabled : true,
      },
    });
  }

  async function update(id: number, data: Record<string, any>) {
    const updateData: Record<string, any> = {};
    const keys = ["trigger", "match", "reply_type", "text", "title", "desc", "pic_url", "link_url", "sort", "enabled"];
    for (const k of keys) if (data[k] !== undefined) updateData[k] = data[k];
    return strapi.db.query(REPLY_UID).update({ where: { id }, data: updateData });
  }

  async function remove(id: number) {
    return strapi.db.query(REPLY_UID).delete({ where: { id } });
  }

  return {
    list,
    findOne,
    create,
    update,
    remove,

    /** 命中关键字规则：关键字精确命中 → 未命中取 fallback 兜底；均无返回 null */
    async matchText(content: string) {
      const text = (content || "").trim();
      if (!text) return null;
      const kw = await strapi.db.query(REPLY_UID).findMany({
        where: { trigger: "keyword", match: text, enabled: true },
        limit: 1,
      });
      if (kw[0]) return kw[0];
      const fb = await strapi.db.query(REPLY_UID).findMany({
        where: { trigger: "fallback", enabled: true },
        orderBy: { sort: "asc", createdAt: "asc" },
        limit: 1,
      });
      return fb[0] || null;
    },

    /** 命中关注欢迎语规则（取未启用顺序的首条） */
    async findWelcome() {
      const rows = await strapi.db.query(REPLY_UID).findMany({
        where: { trigger: "welcome", enabled: true },
        orderBy: { sort: "asc", createdAt: "asc" },
        limit: 1,
      });
      return rows[0] || null;
    },
  };
};