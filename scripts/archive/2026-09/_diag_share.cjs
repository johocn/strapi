const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
(async () => {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  try {
    console.log('--- 规则行完整状态 ---');
    const rule = await pool.query(
      "SELECT action, category, points, enabled, limit_per_day, is_one_time, task_group, extra_config, published_at, created_at, updated_at FROM zhao_point_rules WHERE action='activity_share'"
    );
    console.log(JSON.stringify(rule.rows, null, 2));

    console.log('--- user 关联信息（最近登录用户）---');
    const users = await pool.query(
      "SELECT id, username, email, blocked FROM up_users ORDER BY id LIMIT 20"
    );
    console.log(JSON.stringify(users.rows, null, 2));

    console.log('--- activity_share 相关点记录（全部）---');
    const rec = await pool.query(
      "SELECT r.id, r.action, r.points, r.type, r.method, r.remark, r.created_at FROM zhao_point_records r WHERE r.action LIKE '%str%' OR r.action LIKE '%share%' ORDER BY r.created_at DESC LIMIT 30"
    );
    console.log(JSON.stringify(rec.rows, null, 2));

    console.log('--- point_record user 关联（sample）---');
    const lnk = await pool.query(
      "SELECT u.id AS user_id, u.username, pr.action, pr.points, pr.type, pr.created_at FROM zhao_point_records_user_lnk ul JOIN zhao_point_records pr ON pr.id=ul.point_record_id JOIN up_users u ON u.id=ul.user_id ORDER BY pr.created_at DESC LIMIT 15"
    );
    console.log(JSON.stringify(lnk.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();