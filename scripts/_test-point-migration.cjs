const { Client } = require("pg");
const path = require("path");

const client = new Client({
  host: "127.0.0.1",
  port: 5432,
  database: "strapi",
  user: "postgres",
  password: "admin",
});

// 用 pg Client 包装成 knex-like 的 db 对象（只用到 raw + client.config.client）
const db = {
  raw: (sql) => client.query(sql),
  client: { config: { client: "postgres" } },
};

const LINK_TABLES = [
  "zhao_point_records_user_lnk",
  "zhao_point_redemptions_user_lnk",
  "zhao_channel_verifications_verifier_lnk",
  "zhao_channel_verifications_verified_user_lnk",
  "zhao_point_sign_in_records_user_lnk",
];

async function showState(label) {
  console.log(`\n########## ${label} ##########`);
  for (const t of LINK_TABLES) {
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}'`
    );
    const fks = await client.query(
      `SELECT conname, confrelid::regclass AS ref FROM pg_constraint
        WHERE contype='f' AND conrelid='"public"."${t}"'::regclass`
    );
    console.log(`[${t}] cols=${cols.rows.map((c) => c.column_name).join(",")}`);
    fks.rows.forEach((f) => console.log(`    FK ${f.conname} -> ${f.ref}`));
  }
}

async function main() {
  await client.connect();

  // 备份 5 张表
  for (const t of LINK_TABLES) {
    await client.query(`CREATE TABLE IF NOT EXISTS "backup_${t}" AS SELECT * FROM "public"."${t}"`);
  }

  const migration = require(path.join(__dirname, "..", "plugins", "zhao-point", "server", "database", "migrations", "20260815_link_users_permissions.js"));

  await showState("BEFORE (up)");

  await migration.up({ db });
  await showState("AFTER UP");

  await migration.down({ db });
  await showState("AFTER DOWN");

  // 恢复备份
  for (const t of LINK_TABLES) {
    await client.query(`DROP TABLE IF EXISTS "backup_${t}"`);
  }

  await client.end();
  console.log("\nDONE");
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});