const { Client } = require("pg");
const c = new Client({ host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" });
(async () => {
  await c.connect();
  // 置为完成
  await c.query("update zhao_lesson_progresses set progress=100, play_position=15, duration=15, is_completed=true, updated_at=now() where id in (14,15)");
  console.log("DB set 14,15 to completed");
  const p = await c.query("select id, progress, play_position, is_completed from zhao_lesson_progresses where id in (14,15)");
  console.log("after:", p.rows);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });