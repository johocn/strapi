import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const APP_UID = "plugin::zhao-sso.sso-app";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async count(where?: any) {
    return strapi.db.query(APP_UID).count({ where });
  },

  async findMany(params?: { orderBy?: any }) {
    return strapi.db.query(APP_UID).findMany({
      orderBy: params?.orderBy || { app_code: "asc" },
    });
  },

  async create(data: {
    app_code: string;
    app_name: string;
    app_secret?: string;
    redirect_uris?: string[];
    allowed_grant_types?: string[];
    is_active?: boolean;
    description?: string;
  }) {
    // app_secret 未提供时从环境变量读取,仍未配置则报错(避免硬编码默认密钥)
    const secret = data.app_secret || process.env.SSO_DEFAULT_APP_SECRET;
    if (!secret) {
      const e: any = new Error("app_secret 必填或设置 SSO_DEFAULT_APP_SECRET 环境变量");
      e.code = "SSO_APP_001";
      e.status = 400;
      throw e;
    }
    return strapi.db.query(APP_UID).create({
      data: {
        app_code: data.app_code,
        app_name: data.app_name,
        app_secret: await bcrypt.hash(secret, 10),
        redirect_uris: data.redirect_uris || [],
        allowed_grant_types: data.allowed_grant_types || ["authorization_code", "refresh_token"],
        is_active: data.is_active !== undefined ? data.is_active : true,
        description: data.description || null,
      },
    });
  },

  async update(id: number, body: any) {
    const allowedFields = ["app_name", "redirect_uris", "allowed_grant_types", "is_active", "description", "app_secret"];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (data.app_secret) {
      data.app_secret = await bcrypt.hash(data.app_secret, 10);
    }
    return strapi.db.query(APP_UID).update({ where: { id }, data });
  },
});
