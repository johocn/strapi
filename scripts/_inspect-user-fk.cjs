const { Client } = require("pg");
const client = new Client({
  host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin",
});

const TABLES = [
  "zhao_lesson_progresses",
  "zhao_course_progresses",
  "zhao_course_enrollments",
  "zhao_course_access_codes",
  "zhao_user_course_auths",
  "zhao_user_invites",
  "zhao_user_invites_user_lnk",
  "zhao_user_channels",
  "zhao_channel_members",
  "zhao_quiz_records",
  "zhao_quiz_exam_attempts",
  "zhao_visit_logs",
  "zhao_interactions",
  "zhao_wealth_customer_products",
  "zhao_wealth_customer_holdings",
  "zhao_third_party_accounts",
  "zhao_conversion_events",
  "zhao_channel_verifications",
];

async function main() {
  await client.connect();
  for (const t of TABLES) {
    const exists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${t}'`
    );
    if (exists.rows.length === 0) { console.log(`\n[MISSING] ${t}`); continue; }
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position`
    );
    const fks = await client.query(
      `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE contype='f' AND conrelid='"public"."${t}"'::regclass`
    );
    console.log(`\n=== ${t} ===`);
    console.log("cols:", cols.rows.map((r) => r.column_name).join(", "));
    console.log("FKs:");
    fks.rows.forEach((r) => console.log("  ", r.conname, "=>", r.def));
  }
  await client.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });