import type { Core } from "@strapi/strapi";
import bcrypt from "bcryptjs";

/**
 * 确保系统中存在至少一个 admin 角色用户。
 * 若已有任意用户的 zhao_roles 包含 "admin"，则跳过；否则创建。
 * 凭证从环境变量读取，未设置则用默认值（仅适用于首次初始化）。
 */
async function ensureAdminUser(strapi: Core.Strapi) {
  try {
    // 用 knex 查询，避免 Strapi Document Service 对 jsonb 的封装差异
    const knex = (strapi.db as any).connection;
    const existing = await knex("up_users")
      .whereRaw("zhao_roles @> ?::jsonb", [JSON.stringify(["admin"])])
      .select("id", "username", "email")
      .first();

    if (existing) {
      strapi.log.info(
        `zhao-auth: 已存在 admin 用户（id=${existing.id}, username=${existing.username}），跳过初始化`
      );
      return;
    }

    const username = process.env.INIT_ADMIN_USERNAME || "admin";
    const email = process.env.INIT_ADMIN_EMAIL || "admin@example.com";
    const password = process.env.INIT_ADMIN_PASSWORD || "Admin@12345";

    // 检查用户名/邮箱是否被占用
    const dup = await knex("up_users")
      .where("username", username)
      .orWhere("email", email)
      .select("id", "username", "email")
      .first();

    if (dup) {
      strapi.log.warn(
        `zhao-auth: 用户名或邮箱已被占用（id=${dup.id}, username=${dup.username}），但该用户非 admin 角色。跳过 admin 初始化，请手动处理。`
      );
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const documentId = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : require("crypto").randomUUID();
    const now = new Date();

    await knex("up_users").insert({
      document_id: documentId,
      username,
      email,
      password: hash,
      provider: "local",
      confirmed: true,
      blocked: false,
      zhao_roles: JSON.stringify(["admin"]),
      created_at: now,
      updated_at: now,
      published_at: now,
    });

    strapi.log.info(
      `zhao-auth: ✅ 已创建第一个 admin 用户（username=${username}, email=${email}）。请尽快修改默认密码。`
    );
  } catch (error: any) {
    strapi.log.warn(
      `zhao-auth: admin 用户初始化失败: ${error?.message || String(error)}`
    );
  }
}

/**
 * zhao-auth 引导函数
 * 启动时自动初始化默认角色（如果不存在）
 */
const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("zhao-auth: 插件已启动");

  // 延时初始化默认角色，等待内容类型注册完成
  setTimeout(async () => {
    try {
      const results = await strapi
        .plugin("zhao-auth")
        .service("permission")
        .initDefaultRoles();

      if (results && results.length) {
        strapi.log.info(
          `zhao-auth: 角色初始化完成 [${results.join(", ")}]`
        );
      }

      // 角色初始化完成后，确保存在 admin 用户
      await ensureAdminUser(strapi);
    } catch (error: any) {
      strapi.log.warn(
        `zhao-auth: 角色初始化失败（可能是 content-type 尚未就绪，可通过 POST /api/zhao-auth/v1/admin/permissions/init 手动触发）: ${
          error?.message || String(error)
        }`
      );
    }
  }, 3000);
};

export default bootstrap;
