const { Client } = require("pg");
const c = new Client({ host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" });
(async () => {
  await c.connect();
  const cols = await c.query(
    "select column_name from information_schema.columns where table_name='zhao_lesson_progresses' order by ordinal_position"
  );
  console.log("columns:", cols.rows.map(r => r.column_name).join(", "));
  const p15 = await c.query("select * from zhao_lesson_progresses where id=15");
  console.log("id=15:", p15.rows);
  const p14 = await c.query("select * from zhao_lesson_progresses where id=14");
  console.log("id=14:", p14.rows);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });