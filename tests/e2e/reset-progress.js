// 重置指定课时的学习进度为"未完成 + 指定播放位置"，用于测试续播/完成弹窗
// 用法: node tests/e2e/reset-progress.js <lessonDocId> <progress> <playPosition> <isCompleted>
const { Client } = require("pg");

const lessonDocId = process.argv[2];
const progress = Number(process.argv[3] ?? 0);
const playPosition = Number(process.argv[4] ?? 0);
const isCompleted = process.argv[5] === "true";

const client = new Client({
  host: "127.0.0.1", port: 5432, database: "strapi",
  user: "postgres", password: "admin",
});

(async () => {
  await client.connect();
  // 找到课时 id
  const l = await client.query("select id from zhao_course_lessons where document_id = $1 limit 1", [lessonDocId]);
  if (!l.rows[0]) { console.log("no lesson", lessonDocId); process.exit(1); }
  const lessonId = l.rows[0].id;
  // 通过 join 表找到该课时关联的所有进度记录 id（可能存在多条：不同用户/历史记录）
  const j = await client.query("select lesson_progress_id from zhao_lesson_progresses_lesson_lnk where course_lesson_id = $1", [lessonId]);
  if (!j.rows.length) { console.log("no progress record for lesson", lessonDocId); process.exit(1); }
  const pids = j.rows.map(r => r.lesson_progress_id);
  const res = await client.query(
    "update zhao_lesson_progresses set progress=$1, play_position=$2, duration=15, is_completed=$3, updated_at=now() where id = ANY($4::int[])",
    [progress, playPosition, isCompleted, pids]
  );
  console.log("reset", res.rowCount, "records, ids", pids, "lesson", lessonDocId, { progress, playPosition, isCompleted });
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });