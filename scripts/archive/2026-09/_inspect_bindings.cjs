// 检查备份中 sso_third_party_bindings 及 lnk 的历史数据
// 备份格式: "#T <table>" 后跟该表每行一个 JSON
// 用法: node _inspect_bindings.cjs <backup.jsonl.gz>
const fs = require("fs");
const zlib = require("zlib");
const file = process.argv[2] || "strapi_pre_cleanup_20260830.jsonl.gz";

const data = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
let curTable = null;
for (const line of data.split("\n")) {
  if (!line.trim()) continue;
  if (line.startsWith("#T ")) { curTable = line.slice(3).trim(); continue; }
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (curTable === "sso_third_party_bindings") console.log("BINDING:", JSON.stringify(o));
  if (curTable === "sso_third_party_bindings_user_lnk") console.log("LNK:", JSON.stringify(o));
}
