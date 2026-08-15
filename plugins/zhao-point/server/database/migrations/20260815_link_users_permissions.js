"use strict";

/**
 * 积分模块 user 关系从 zhao-sso 的 sso_users 切换到 zhao-auth 的 users-permissions.user（up_users）。
 * 背景：strapi-course 的积分应关联 zhao-auth 的用户信息表，而非 sso_users。
 *
 * 对 5 个 user 关系 link 表：
 *   1) 删除所有指向 sso_users 的外键
 *   2) 列处理：确保存在 user_id 且删除废弃的 sso_user_id（重命名或删除）
 *   3) 重建名为 {table}_ifk 的外键指向 up_users(id) ON DELETE CASCADE
 */

const LINK_TABLES = [
  "zhao_point_records_user_lnk",
  "zhao_point_redemptions_user_lnk",
  "zhao_channel_verifications_verifier_lnk",
  "zhao_channel_verifications_verified_user_lnk",
  "zhao_point_sign_in_records_user_lnk",
];

const tableExists = async (db, table) => {
  const r = await db.raw(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'`
  );
  return r.rows.length > 0;
};

const getCols = async (db, table) => {
  const r = await db.raw(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}'`
  );
  return r.rows.map((x) => x.column_name);
};

const getFksTo = async (db, table, refTable) => {
  const r = await db.raw(
    `SELECT conname FROM pg_constraint
      WHERE contype='f'
        AND conrelid = '"public"."${table}"'::regclass
        AND confrelid = '"public"."${refTable}"'::regclass`
  );
  return r.rows.map((x) => x.conname);
};

async function up({ db }) {
  const client = (db.client && db.client.config && db.client.config.client) || "";
  if (client !== "postgres") {
    console.log("[migration] 非 postgres，跳过积分用户外键迁移");
    return;
  }

  for (const table of LINK_TABLES) {
    if (!(await tableExists(db, table))) continue;

    // 1) 删除指向 sso_users 的外键
    for (const conname of await getFksTo(db, table, "sso_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }

    // 2) 列处理
    const names = await getCols(db, table);
    const hasUser = names.includes("user_id");
    const hasSso = names.includes("sso_user_id");
    if (hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP COLUMN "sso_user_id"`);
    } else if (!hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" RENAME COLUMN "sso_user_id" TO "user_id"`);
    }

    // 3) 确保存在指向 up_users 的外键
    if ((await getFksTo(db, table, "up_users")).length === 0) {
      await db.raw(
        `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_ifk"
         FOREIGN KEY ("user_id") REFERENCES "public"."up_users"("id") ON DELETE CASCADE`
      );
    }
  }
}

async function down({ db }) {
  const client = (db.client && db.client.config && db.client.config.client) || "";
  if (client !== "postgres") return;

  for (const table of LINK_TABLES) {
    if (!(await tableExists(db, table))) continue;

    // 1) 删除指向 up_users 的外键
    for (const conname of await getFksTo(db, table, "up_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }

    // 2) 列处理
    const names = await getCols(db, table);
    const hasUser = names.includes("user_id");
    const hasSso = names.includes("sso_user_id");
    if (hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP COLUMN "user_id"`);
    } else if (hasUser && !hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" RENAME COLUMN "user_id" TO "sso_user_id"`);
    }

    // 3) 确保存在指向 sso_users 的外键
    if ((await getFksTo(db, table, "sso_users")).length === 0) {
      await db.raw(
        `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_ifk"
         FOREIGN KEY ("sso_user_id") REFERENCES "public"."sso_users"("id") ON DELETE CASCADE`
      );
    }
  }
}

module.exports = { up, down };