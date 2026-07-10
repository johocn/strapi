/**
 * 确保系统中存在至少一个 admin 角色用户。
 * 若已有任意用户的 zhao_roles 包含 "admin"，则跳过；否则创建第一个 admin 用户。
 *
 * 用法：
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=xxxx \
 *   DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=strapi DB_USER=postgres DB_PASSWORD=admin \
 *   node ensure-admin.js
 *
 * 必填环境变量：ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 * 可选环境变量：DB_HOST(默认127.0.0.1) DB_PORT(默认5432) DB_NAME(默认strapi)
 *               DB_USER(默认postgres) DB_PASSWORD(默认admin)
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const {
  ADMIN_USERNAME,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DB_HOST = '127.0.0.1',
  DB_PORT = '5432',
  DB_NAME = 'strapi',
  DB_USER = 'postgres',
  DB_PASSWORD = 'admin',
} = process.env;

function die(msg) {
  console.error('[ensure-admin] ' + msg);
  process.exit(1);
}

if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  die('缺少必填环境变量 ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD');
}

const c = new Client({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});

(async () => {
  await c.connect();
  console.log('[ensure-admin] 已连接数据库');

  // 1. 检查是否已存在 zhao_roles 含 admin 的用户
  const { rows } = await c.query(
    `SELECT id, username, email FROM up_users WHERE zhao_roles @> '["admin"]'::jsonb LIMIT 1`
  );
  if (rows.length > 0) {
    const u = rows[0];
    console.log(`[ensure-admin] 已存在 admin 用户（id=${u.id}, username=${u.username}），跳过创建`);
    await c.end();
    return;
  }

  // 2. 检查用户名/邮箱是否已被占用
  const { rows: dup } = await c.query(
    `SELECT id, username, email FROM up_users WHERE username = $1 OR email = $2 LIMIT 1`,
    [ADMIN_USERNAME, ADMIN_EMAIL]
  );
  if (dup.length > 0) {
    const u = dup[0];
    die(`用户名或邮箱已被占用（id=${u.id}, username=${u.username}, email=${u.email}），但该用户非 admin 角色。请手动处理或更换用户名/邮箱。`);
  }

  // 3. 生成密码哈希（Strapi 使用 bcrypt，成本因子 10）
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 4. 插入用户，document_id 用 crypto.randomUUID()
  const documentId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : require('crypto').randomUUID();
  const now = new Date();
  const { rows: inserted } = await c.query(
    `INSERT INTO up_users
       (document_id, username, email, password, provider, confirmed, blocked, zhao_roles, created_at, updated_at, published_at)
     VALUES ($1, $2, $3, $4, 'local', true, false, '["admin"]'::jsonb, $5, $5, $5)
     RETURNING id, username, email`,
    [documentId, ADMIN_USERNAME, ADMIN_EMAIL, hash, now]
  );

  const u = inserted[0];
  console.log(`[ensure-admin] ✅ 已创建第一个 admin 用户：id=${u.id}, username=${u.username}, email=${u.email}`);
  await c.end();
})().catch(e => {
  die(e.message);
});
