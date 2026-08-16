const { Client } = require("pg");
const c = new Client({ host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" });
(async () => {
  await c.connect();
  const l = await c.query(
    "select id, document_id, title from zhao_course_lessons where document_id in ($1,$2)",
    ["cz26gyrt8sv2ta4rrh16q2h7", "w38nikam37hmjku0feds7x2a"]
  );
  console.log("lessons:", l.rows);
  for (const r of l.rows) {
    const lnk = await c.query("select * from zhao_lesson_progresses_lesson_lnk where course_lesson_id=$1", [r.id]);
    console.log("lesson", r.document_id, r.title, "lnk:", lnk.rows);
    for (const x of lnk.rows) {
      const p = await c.query(
        "select id, progress, play_position, duration, is_completed, user_id, updated_at from zhao_lesson_progresses where id=$1",
        [x.lesson_progress_id]
      );
      console.log("   progress:", p.rows);
    }
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });