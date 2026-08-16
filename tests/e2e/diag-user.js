const { Client } = require("pg");
const c = new Client({ host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" });
(async () => {
  await c.connect();
  const cl = await c.query("select * from zhao_lesson_progresses_course_lnk");
  console.log("course_lnk:", cl.rows);
  // user=3 的所有 progress
  const p = await c.query(
    "select lp.id, lp.progress, lp.play_position, lp.is_completed, " +
    "l.document_id as lesson_doc, l.title as lesson_title " +
    "from zhao_lesson_progresses lp " +
    "left join zhao_lesson_progresses_user_lnk ul on ul.lesson_progress_id=lp.id and ul.sso_user_id=3 " +
    "left join zhao_lesson_progresses_lesson_lnk ll on ll.lesson_progress_id=lp.id " +
    "left join zhao_course_lessons l on l.id=ll.course_lesson_id " +
    "where ul.sso_user_id=3 order by lp.id"
  );
  console.log("user3 progresses:");
  for (const r of p.rows) console.log(" ", r);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });