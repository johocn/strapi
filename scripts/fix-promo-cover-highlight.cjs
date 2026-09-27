/* 宣传页 cover 头部「旧副标题 → 新方案宣传重点」清理（幂等，仅改 cover.config）
 * 背景：新方案中 cover.config.highlight 为宣传重点（一句话卖点），旧字段 subtitle 仅作降级兜底；
 *      subtitle 里往往混着日期等由活动数据自动填充的内容，需人工确认卖点后再清理。
 * 用法:
 *   node scripts/fix-promo-cover-highlight.cjs --doc <documentId> --highlight "进店免费领西瓜"
 *   API_BASE=https://h.joho.cn/api ZHAO_IDENTIFIER=zhao ZHAO_PASSWORD=*** node scripts/fix-promo-cover-highlight.cjs ...
 * 行为: 取该活动 → 仅改写其 cover 模块 config（写入 highlight、删除 subtitle），
 *      其余字段与其它模块原样回写；已符合新方案时不做任何写入。
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:1337/api";
const IDENTIFIER = process.env.ZHAO_IDENTIFIER || "1117";
const PASSWORD = process.env.ZHAO_PASSWORD || "a123456";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : "";
}
const DOC = arg("doc");
const HIGHLIGHT = arg("highlight");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, p, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let r;
  for (let i = 0; i < 15; i++) {
    try {
      r = await fetch(API_BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
      break;
    } catch (e) {
      if (i === 14) return { status: 0, json: { netErr: e.message } };
      await sleep(600);
    }
  }
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

async function main() {
  if (!DOC || !HIGHLIGHT) throw new Error("缺少参数：--doc <documentId> --highlight <卖点短句>");

  const login = await api("POST", "/zhao-auth/v1/login", { body: { identifier: IDENTIFIER, password: PASSWORD } });
  if (login.status !== 200 || !login.json?.jwt) throw new Error("获取管理端 token 失败: " + JSON.stringify(login.json));
  const token = login.json.jwt;

  const got = await api("GET", `/zhao-point/v1/activities/${DOC}`, { token });
  if (got.status !== 200) throw new Error("查询活动失败: " + JSON.stringify(got.json).slice(0, 300));
  const act = got.json?.data || got.json;
  if (!act?.title) throw new Error("活动不存在或返回异常: " + JSON.stringify(got.json).slice(0, 300));

  const modules = Array.isArray(act.promoModules) ? act.promoModules : [];
  const cover = modules.find((m) => m?.type === "cover");
  if (!cover) throw new Error("该活动无 cover 模块，无需清理");

  const cfg = { ...(cover.config || {}) };
  const hasSubtitle = Object.prototype.hasOwnProperty.call(cfg, "subtitle");
  console.log(`活动: ${act.title}（${DOC}）`);
  console.log(`清理前 cover.config = ${JSON.stringify(cfg)}`);
  if (cfg.highlight === HIGHLIGHT && !hasSubtitle) {
    console.log("✔ 已是新方案（highlight 一致且无 subtitle），无需写入");
    return;
  }

  delete cfg.subtitle;
  cfg.highlight = HIGHLIGHT;
  cover.config = cfg;
  console.log(`清理后 cover.config = ${JSON.stringify(cfg)}`);

  const put = await api("PUT", `/zhao-point/v1/admin/adm/activities/${DOC}`, {
    token,
    body: { data: { promoModules: modules } },
  });
  if (put.status < 200 || put.status >= 300) throw new Error("更新活动失败: " + JSON.stringify(put.json).slice(0, 300));

  const verify = await api("GET", `/zhao-point/v1/activities/${DOC}`, { token });
  const after = (verify.json?.data || verify.json)?.promoModules || [];
  const c2 = after.find((m) => m?.type === "cover")?.config || {};
  const ok = c2.highlight === HIGHLIGHT && !("subtitle" in c2);
  console.log(`复测 cover.config = ${JSON.stringify(c2)} → ${ok ? "OK" : "FAILED"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => { console.error("❌ 清理失败:", e.message); process.exit(1); });