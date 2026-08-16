// 为课时1插入测试题目（用于验证答题功能）
const { Client } = require("pg");
const client = new Client({ host: "127.0.0.1", port: 5432, database: "strapi", user: "postgres", password: "admin" });
const crypto = require("crypto");
const genDoc = () => crypto.randomBytes(12).toString("hex").slice(0, 24); // 24位小写十六进制
const LESSON_ID = 11;   // 课时1 w38nikam37hmjku0feds7x2a
const COURSE_ID = 11;   // 顺序课程1 ii0deg28vmbs5njac2p1i0o6
(async () => {
  await client.connect();
  // 清理旧的测试题目（避免重复）
  await client.query("delete from zhao_quizzes_lesson_lnk where course_lesson_id=$1", [LESSON_ID]);
  await client.query("delete from zhao_quizzes_course_lnk where course_id=$1", [COURSE_ID]);
  await client.query("delete from zhao_quizzes where title ilike '%Strapi 的默认数据库%' or title ilike '%模块化框架%'");
  const questions = [
    { title: "Strapi 的默认数据库类型是？", type: "single_choice", answer: "B", options: [{ key: "A", text: "MySQL" }, { key: "B", text: "PostgreSQL" }, { key: "C", text: "SQLite" }, { key: "D", text: "MongoDB" }], isPublished: true, points: 5 },
    { title: "本项目使用哪个模块化框架？", type: "single_choice", answer: "A", options: [{ key: "A", text: "Strapi" }, { key: "B", text: "Express" }, { key: "C", text: "NestJS" }, { key: "D", text: "Koa" }], isPublished: true, points: 5 },
  ];
  for (const q of questions) {
    const docid = genDoc();
    const ins = await client.query(
      "insert into zhao_quizzes (document_id, title, type, options, answer, is_published, points, sort, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8, now(), now()) returning id",
      [docid, q.title, q.type, JSON.stringify(q.options), q.answer, q.isPublished, q.points, 0]
    );
    const qid = ins.rows[0].id;
    // 关联课时
    await client.query("insert into zhao_quizzes_lesson_lnk (quiz_id, course_lesson_id, quiz_ord) values ($1,$2,$3) on conflict do nothing", [qid, LESSON_ID, 0]);
    // 关联课程
    await client.query("insert into zhao_quizzes_course_lnk (quiz_id, course_id, quiz_ord) values ($1,$2,$3) on conflict do nothing", [qid, COURSE_ID, 0]);
    console.log("插入题目 id=", qid, "doc=", docid, q.title);
  }
  await client.end();
  console.log("完成");
})().catch(e => { console.error(e.message); process.exit(1); });