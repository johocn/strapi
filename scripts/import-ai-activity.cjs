/* 一键把「AI 网页输出」导入为活动草稿（draft）
 * 用法: cd e:\code\basic && node scripts/import-ai-activity.cjs [payload.json]
 * 默认读取 _ai-payload.json；require test-import-contract.cjs 顺带跑 42 项契约测试作为前置校验。
 * 前置: 本地 Strapi develop(127.0.0.1:1337) 运行
 */
const fs = require("fs");
const path = require("path");
const { importActivity } = require("./test-import-contract.cjs");

const BASE = "http://127.0.0.1:1337/api";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 15; i++) {
    try { r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined }); break; }
    catch (e) { if (i === 14) return { status: 0, json: { netErr: e.message } }; await sleep(600); }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function main() {
  const file = process.argv[2] || "_ai-payload.json";
  const raw = fs.readFileSync(path.resolve(__dirname, file), "utf8");

  // 1) 验证 + 归一化（含相对时间换算 / 默认值 / URL 清洗）
  const r = importActivity(raw, new Date());
  if (!r.ok) {
    console.log("❌ 导入失败，字段级错误：");
    r.errors.forEach((e) => console.log("  - " + e));
    process.exit(1);
  }
  const body = r.body;
  console.log("✔ 校验通过，归一化结果：");
  console.log("  title:", body.title, "| type:", body.type, "| template:", body.promoTemplate);
  console.log("  startTime:", body.startTime, "| endTime:", body.endTime);
  console.log("  signupStart:", body.signupStart, "| signupEnd:", body.signupEnd);
  console.log("  modules:", body.promoModules.length, "个 | formConfig:", body.formConfig.length, "字段 | status:", body.status);

  // 2) 登录拿 admin token
  const login = await api("POST", "/zhao-auth/v1/login", { body: { identifier: "1117", password: "a123456" } });
  if (login.status !== 200 || !login.json?.jwt) throw new Error("获取 admin token 失败: " + JSON.stringify(login.json));
  const token = login.json.jwt;

  // 3) 创建活动草稿
  const created = await api("POST", "/zhao-point/v1/admin/adm/activities", { token, body });
  if (created.status < 200 || created.status >= 300) {
    console.error("❌ 创建活动失败:", JSON.stringify(created.json));
    process.exit(1);
  }
  const d = created.json?.data || created.json;
  console.log("\n✔ 已创建活动草稿:", d?.documentId || d?.id, "|", d?.title || body.title);
  console.log("  宣传页访问: /pages/activity/promo?act=" + (d?.documentId || d?.id));
  console.log("  注意: 联系方式/封面图是占位，需在活动编辑页替换后发布");
}

main().catch((e) => { console.error("导入脚本失败:", e.message); process.exit(1); });
