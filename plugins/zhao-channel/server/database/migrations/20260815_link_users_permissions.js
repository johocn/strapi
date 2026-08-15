"use strict";

/**
 * zhao-channel 用户关系从 zhao-sso 的 sso_users 切换到 zhao-auth 的 users-permissions.user（up_users）。
 * 背景：除 SSO 登录外，所有功能统一使用 zhao-auth 用户表。C 端登录（zhao-auth）产生的
 * ctx.state.user.id 为 up_users.id，此前 schema 误关联 sso_users 导致：
 *   - zhao_user_invites_user_lnk 外键约束冲突（zhao_user_invites_user_lnk_ifk）
 * 本迁移处理：
 *   A) 一对一(oneToOne) link 表：把目标列 sso_user_id 重命名为 user_id，外键改指 up_users
 *   B) 多对一(manyToOne) 主表列：若存在指向 sso_users 的外键，改指 up_users；若列为 sso_user_id 则重命名
 */

// A) oneToOne 关系生成的 link 表（目标列名为 sso_user_id）
const LINK_TABLES = [
  "zhao_user_invites_user_lnk",
  "zhao_course_enrollments_reviewer_lnk",
  "zhao_course_access_codes_created_by_lnk",
  "zhao_course_access_codes_used_by_lnk",
];

// B) manyToOne 关系主表列（列名 = 关系字段名）
const OWNER_TABLES = [
  { table: "zhao_lesson_progresses", col: "user_id" },
  { table: "zhao_course_progresses", col: "user_id" },
  { table: "zhao_course_enrollments", col: "user_id" },
  { table: "zhao_user_course_auths", col: "user_id" },
  { table: "zhao_user_channels", col: "user_id" },
  { table: "zhao_user_channels", col: "granted_by_id" },
  { table: "zhao_channel_members", col: "user_id" },
  { table: "zhao_channel_members", col: "invited_by_id" },
  { table: "zhao_quiz_records", col: "user_id" },
  { table: "zhao_quiz_records", col: "grader_id" },
  { table: "zhao_quiz_exam_attempts", col: "user_id" },
  { table: "wealth_customer_products", col: "user_id" },
  { table: "wealth_customer_holdings", col: "user_id" },
  { table: "zhao_third_party_accounts", col: "user_id" },
  { table: "zhao_visit_logs", col: "user_id" },
  { table: "zhao_interactions", col: "user_id" },
  { table: "zhao_conversion_events", col: "user_id" },
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
    console.log("[migration] 非 postgres，跳过 zhao-channel 用户外键迁移");
    return;
  }

  // A) oneToOne link 表
  for (const table of LINK_TABLES) {
    if (!(await tableExists(db, table))) continue;

    // 1) 删除指向 sso_users 的外键
    for (const conname of await getFksTo(db, table, "sso_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }

    // 2) 列处理：sso_user_id -> user_id
    const names = await getCols(db, table);
    const hasUser = names.includes("user_id");
    const hasSso = names.includes("sso_user_id");
    if (hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP COLUMN "sso_user_id"`);
    } else if (!hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" RENAME COLUMN "sso_user_id" TO "user_id"`);
    }

    // 3) 确保指向 up_users 的外键
    if (hasUser || hasSso) {
      if ((await getFksTo(db, table, "up_users")).length === 0) {
        await db.raw(
          `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_ifk"
           FOREIGN KEY ("user_id") REFERENCES "public"."up_users"("id") ON DELETE CASCADE`
        );
      }
    }
  }

  // B) manyToOne 主表列
  for (const { table, col } of OWNER_TABLES) {
    if (!(await tableExists(db, table))) continue;
    const names = await getCols(db, table);
    if (!names.includes(col)) continue;

    // 若列名是遗留的 sso_user_id，重命名为目标列名
    if (col !== "sso_user_id" && names.includes("sso_user_id") && !names.includes(col)) {
      await db.raw(`ALTER TABLE "public"."${table}" RENAME COLUMN "sso_user_id" TO "${col}"`);
    }

    // 删除指向 sso_users 的外键，改指 up_users
    for (const conname of await getFksTo(db, table, "sso_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }
    if ((await getFksTo(db, table, "up_users")).length === 0) {
      await db.raw(
        `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_${col}_ifk"
         FOREIGN KEY ("${col}") REFERENCES "public"."up_users"("id") ON DELETE CASCADE`
      );
    }
  }
}

async function down({ db }) {
  const client = (db.client && db.client.config && db.client.config.client) || "";
  if (client !== "postgres") return;

  // 还原 oneToOne link 表
  for (const table of LINK_TABLES) {
    if (!(await tableExists(db, table))) continue;
    for (const conname of await getFksTo(db, table, "up_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }
    const names = await getCols(db, table);
    const hasUser = names.includes("user_id");
    const hasSso = names.includes("sso_user_id");
    if (hasUser && hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP COLUMN "user_id"`);
    } else if (hasUser && !hasSso) {
      await db.raw(`ALTER TABLE "public"."${table}" RENAME COLUMN "user_id" TO "sso_user_id"`);
    }
    if (hasUser || hasSso) {
      await db.raw(
        `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_ifk"
         FOREIGN KEY ("sso_user_id") REFERENCES "public"."sso_users"("id") ON DELETE CASCADE`
      );
    }
  }

  // 还原 manyToOne 主表列
  for (const { table, col } of OWNER_TABLES) {
    if (!(await tableExists(db, table))) continue;
    const names = await getCols(db, table);
    if (!names.includes(col)) continue;
    for (const conname of await getFksTo(db, table, "up_users")) {
      await db.raw(`ALTER TABLE "public"."${table}" DROP CONSTRAINT "${conname}"`);
    }
    await db.raw(
      `ALTER TABLE "public"."${table}" ADD CONSTRAINT "${table}_${col}_ifk"
       FOREIGN KEY ("${col}") REFERENCES "public"."sso_users"("id") ON DELETE CASCADE`
    );
  }
}

module.exports = { up, down };