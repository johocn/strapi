// 分享领分冷却锁定功能实测脚本：在服务器 /www/apps/strapi 下运行
// 读取服务器 .env -> 取 sso 用户 -> 用 SSO_JWT_SECRET 签发访问 token -> 调 live 接口
// 用用户 id=2(赵义涛, 有真实渠道) 领分，最后清理本次创建的积分记录，不影响线上数据
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: ".env" });

const BASE = "http://127.0.0.1:1337/api";
const TARGET_USER_ID = 2; // 赵义涛，有渠道归属，earn 校验可通过

function loadEnvVar(name) {
  try {
    const txt = fs.readFileSync(".env", "utf-8");
    const m = txt.match(new RegExp(`^${name}=(.+)$`, "m"));
    return m ? m[1].trim() : undefined;
  } catch { return undefined; }
}

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  const secret = process.env.SSO_JWT_SECRET || loadEnvVar("SSO_JWT_SECRET");
  if (!secret) throw new Error("SSO_JWT_SECRET 未配置");

  const usr = await pool.query(
    "SELECT u.id, u.username, s.uuid, s.document_id FROM up_users u JOIN sso_users s ON s.id=u.id WHERE u.id=$1",
    [TARGET_USER_ID]
  );
  const target = usr.rows[0];
  if (!target) throw new Error(`未找到 sso 用户 id=${TARGET_USER_ID}`);

  const token = jwt.sign(
    { sub: target.uuid, app_code: "default", roles: ["user"], type: "access", jti: uuidv4() },
    secret,
    { algorithm: "HS256", expiresIn: "15m" }
  );
  const H = { Authorization: `Bearer ${token}`, "x-site-domain": "v.joho.cn" };
  console.log("测试用户:", target.id, target.username, "uuid:", target.uuid);

  async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method, headers: { ...H, "Content-Type": "application/json" },
      body: body ? JSON.stringify({ data: body }) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
  const step = (name, r) =>
    console.log(`\n[${name}] http=${r.status} ` + (typeof r.data === "string" ? r.data : JSON.stringify(r.data)));

  // 记录本次领分创建的 record id，用于清理
  const created = [];

  // 1) 分享状态（首次，应可领）
  step("1-status-首次", await call("GET", "/zhao-point/v1/my/point/share/status?activityId="));

  // 2) 领取
  const earn = await call("POST", "/zhao-point/v1/my/point/earn/share", { action: "activity_share" });
  step("2-earn-领取", earn);
  created.push(earn?.data?.record?.id ?? earn?.data?.id ?? earn?.data?.data?.id);

  // 3) 领取后再查状态（应冷却中/不可领）
  step("3-status-领取后", await call("GET", "/zhao-point/v1/my/point/share/status?activityId="));

  // 4) 立即再领（应因冷却被拒 POINT_020）
  step("4-earn-冷却中再领", await call("POST", "/zhao-point/v1/my/point/earn/share", { action: "activity_share" }));

  // 5) 核实落库记录
  const rec = await pool.query(
    "SELECT r.id,r.points,r.type,r.method,r.remark,r.created_at FROM zhao_point_records r WHERE r.action='activity_share' AND r.type='increase' AND r.id IN (SELECT point_record_id FROM zhao_point_records_user_lnk WHERE user_id=$1) ORDER BY r.created_at DESC LIMIT 3",
    [target.id]
  );
  console.log("\n[落库 activity_share 记录]", JSON.stringify(rec.rows, null, 2));
  for (const r of rec.rows) created.push(r.id);

  // 清理：删除本次创建的 activity_share 记录及其 lnk（余额是 SUM 实时算的，删记录即还原）
  const defined = created.filter((x) => x != null);
  if (defined.length > 0) {
    const inList = defined.map((_, i) => `$${i + 1}`).join(",");
    await pool.query(`DELETE FROM zhao_point_records_user_lnk WHERE point_record_id IN (${inList})`, defined);
    await pool.query(`DELETE FROM zhao_point_records WHERE id IN (${inList})`, defined);
    console.log("\n[清理] 已删除本次测试创建的 point_record 及 lnk:", defined.length);
  } else {
    console.log("\n[清理] 无新创建记录，无需清理");
  }

  await pool.end();
}

main().catch((e) => { console.error("脚本出错:", e.message); process.exit(1); });