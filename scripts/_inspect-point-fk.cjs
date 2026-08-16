const { Client } = require("pg");

const client = new Client({
  host: "127.0.0.1",
  port: 5432,
  database: "strapi",
  user: "postgres",
  password: "admin",
});

async function main() {
  await client.connect();

  const tables = [
    "zhao_point_records_user_lnk",
    "zhao_point_redemptions_user_lnk",
    "zhao_channel_verifications_verifier_lnk",
    "zhao_channel_verifications_verified_user_lnk",
    "zhao_point_sign_in_records_user_lnk",
  ];
  for (const t of tables) {
    const idx = await client.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='${t}'`
    );
    console.log(`\n=== indexes ${t} ===`);
    console.table(idx.rows);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});