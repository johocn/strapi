// 活动「AI 导入」契约可行性测试
// 验证：剥代码块 → JSON 解析 → 必填/枚举校验 → 相对时间换算 → 默认值补全 → promoModules 归一化
// 用法: node scripts/test-import-contract.cjs
const PROMO_MODULE_TYPES = ["cover","info","rich","highlights","speakers","agenda","images","rewards","contact","message","faq","custom"];
const PROMO_TEMPLATES = ["summit","salon","training","action","life"];
const PRICING_MODES = ["flat","tier","factor"];
const FEE_COLLECT_ATS = ["signup","checkin"];
const CHECKIN_MODES = ["worker_scan","self","both"];
const TIME_REL = /^\+(\d+)d\s+(\d{1,2}):(\d{2})$/;
const TIME_ABS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function stripCodeBlock(raw) {
  let s = String(raw ?? "");
  s = s.replace(/```[a-zA-Z]*\s*/g, "").replace(/```/g, "");
  const i = s.indexOf("{");
  const j = s.lastIndexOf("}");
  if (i < 0 || j < 0 || j <= i) return s;
  return s.slice(i, j + 1);
}

function parseTime(v, now) {
  if (v === undefined || v === null || v === "") return { ok: false, why: "时间为空" };
  v = String(v).trim();
  let m = v.match(TIME_REL);
  if (m) {
    const days = parseInt(m[1], 10), hh = parseInt(m[2], 10), mm = parseInt(m[3], 10);
    if (days < 0 || days > 365 || hh > 23 || mm > 59) return { ok: false, why: "相对时间非法: " + v };
    const d = new Date(now.getTime() + days * 86400000);
    d.setHours(hh, mm, 0, 0);
    return { ok: true, value: d };
  }
  if (TIME_ABS.test(v)) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return { ok: false, why: "绝对时间非法: " + v };
    return { ok: true, value: d };
  }
  return { ok: false, why: "时间格式非法: " + v };
}

function addHours(d, h) { return new Date(d.getTime() + h * 3600000); }

/** 模块 config 标准化：AI 契约格式 → C 端渲染组件期望的格式 */
function normalizeModuleConfig(type, config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  const c = { ...config };
  if (type === "highlights") {
    // 兼容 items(字符串数组) → points；points 优先透传
    const pts = Array.isArray(c.items) ? c.items.filter((x) => typeof x === "string") : [];
    if (pts.length) c.points = pts;
    delete c.items;
  } else if (type === "agenda") {
    // 兼容二维数组 [t,title,desc?] → 对象数组 {t,title,desc}
    if (Array.isArray(c.items)) {
      c.items = c.items.map((it) => {
        if (Array.isArray(it)) {
          const o = { t: String(it[0] ?? ""), title: String(it[1] ?? "") };
          if (it[2] != null) o.desc = String(it[2]);
          return o;
        }
        return it;
      });
    }
  } else if (type === "speakers") {
    // C 端读讲师关联实体（lecturer），config 内 items 无效，仅保留 title
    const title = typeof c.title === "string" ? c.title : undefined;
    delete c.items;
    if (title) c.title = title;
  }
  return c;
}

function normalizePromoModules(pm) {
  if (pm === undefined || pm === null) return undefined;
  if (!Array.isArray(pm)) throw new Error("promoModules 必须为数组");
  const seen = new Set(), out = [];
  for (const m of pm) {
    if (!m || typeof m !== "object") continue;
    if (!PROMO_MODULE_TYPES.includes(m.type)) continue;
    const sort = Number.isFinite(Number(m.sort)) ? Number(m.sort) : out.length;
    if (seen.has(sort)) continue;
    seen.add(sort);
    out.push({ type: m.type, config: normalizeModuleConfig(m.type, m.config), sort });
  }
  return out.sort((a, b) => a.sort - b.sort);
}

function defaultModules() {
  return ["cover","info","rich","highlights","agenda","rewards","contact","faq","message"].map((type, i) => ({ type, config: {}, sort: i + 1 }));
}

// 核心：与后端 import 接口一致的解析+校验+换算+归一化
function importActivity(rawText, now) {
  const errors = [];
  const body = { status: "draft" };
  let obj;
  try { obj = JSON.parse(stripCodeBlock(rawText)); }
  catch (e) { return { ok: false, errors: ["JSON 解析失败: " + e.message], body: null }; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, errors: ["顶层必须是 JSON 对象"], body: null };

  if (typeof obj.title !== "string" || !obj.title.trim()) errors.push("title 必填");
  else if (obj.title.trim().length < 2 || obj.title.trim().length > 60) errors.push("title 长度需 2~60 字");
  else body.title = obj.title.trim();

  if (typeof obj.type !== "string" || !obj.type.trim()) errors.push("type 必填");
  else body.type = obj.type.trim();

  if (typeof obj.description !== "string" || !obj.description.trim()) errors.push("description 必填");
  else if (obj.description.length > 2000) errors.push("description 超长(≤2000)");
  else body.description = obj.description.trim();

  const t = parseTime(obj.startTime, now);
  if (!t.ok) errors.push("startTime " + t.why);
  else {
    const start = t.value;
    body.startTime = start.toISOString();
    const e = parseTime(obj.endTime, now);
    body.endTime = e.ok ? e.value.toISOString() : addHours(start, 3).toISOString();
    body.signupStart = new Date(now).toISOString();
    body.signupEnd = start.toISOString();
  }

  if (obj.category !== undefined && obj.category !== null) body.category = String(obj.category);
  if (obj.venueName !== undefined && obj.venueName !== null) body.venueName = String(obj.venueName);

  if (obj.capacity !== undefined && obj.capacity !== null) {
    const c = Number(obj.capacity);
    if (!Number.isInteger(c) || c < 1 || c > 10000) errors.push("capacity 需为 1~10000 的整数");
    else body.capacity = c;
  } else body.capacity = 100;

  if (obj.cashPrice !== undefined && obj.cashPrice !== null) {
    const p = Number(obj.cashPrice);
    if (isNaN(p) || p < 0) errors.push("cashPrice 需为 ≥0 的数字");
    else body.cashPrice = p;
  } else body.cashPrice = 0;

  for (const [k, v, allowed] of [
    ["pricingMode", obj.pricingMode ?? "flat", PRICING_MODES],
    ["feeCollectAt", obj.feeCollectAt ?? "signup", FEE_COLLECT_ATS],
    ["checkinMode", obj.checkinMode ?? "both", CHECKIN_MODES],
    ["promoTemplate", obj.promoTemplate ?? "summit", PROMO_TEMPLATES],
  ]) {
    if (!allowed.includes(v)) errors.push(k + " 取值非法: " + JSON.stringify(v) + "（合法: " + allowed.join("/") + "）");
    else body[k] = v;
  }

  try { body.promoModules = normalizePromoModules(obj.promoModules) ?? defaultModules(); }
  catch (e) { errors.push("promoModules " + e.message); }

  body.promoContact = obj.promoContact && typeof obj.promoContact === "object" && !Array.isArray(obj.promoContact)
    ? obj.promoContact
    : { phone: "请填写真实电话", wechat: "请填写真实微信号", note: "请运营替换为真实联系方式" };

  body.formConfig = Array.isArray(obj.formConfig) && obj.formConfig.length
    ? obj.formConfig.filter((f) => f && typeof f === "object" && f.name && f.label)
    : [
        { name: "name", label: "姓名", type: "text", required: true, placeholder: "请输入姓名" },
        { name: "phone", label: "手机号", type: "text", required: true, placeholder: "请输入手机号" },
      ];

  const rc = obj.rewardConfig && typeof obj.rewardConfig === "object" ? obj.rewardConfig : {};
  body.rewardConfig = {
    loginEnabled: !!rc.loginEnabled,
    selectMode: ["all", "one", "any"].includes(rc.selectMode) ? rc.selectMode : "all",
    selectN: Math.max(1, Number(rc.selectN) || 1),
    rewards: Array.isArray(rc.rewards) ? rc.rewards.filter((r) => r && typeof r === "object" && r.id && r.name) : [],
  };

  if (Array.isArray(obj.tags)) body.tags = obj.tags.filter((x) => typeof x === "string").slice(0, 10);
  if (Array.isArray(obj.assets)) body.assets = obj.assets
    .filter((a) => a && typeof a === "object" && typeof a.url === "string")
    .map((a) => ({ ...a, url: String(a.url).replace(/`/g, "").trim() }))
    .slice(0, 9);

  if (errors.length) return { ok: false, errors, body };
  return { ok: true, errors: [], body };
}

// ---------- 测试 ----------
const NOW = new Date("2026-08-25T10:30:00");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✔ " + name); }
  else { fail++; console.log("  ✘ " + name + (detail ? " -> " + detail : "")); }
}

const GOOD = {
  title: "城市咖啡手作品鉴沙龙", type: "沙龙", category: "沙龙",
  description: "沉浸式咖啡风味探索，现场品鉴 4 款精品豆，主理人手冲带练。",
  startTime: "+7d 14:00", endTime: "+7d 16:30", venueName: "城市客厅 · 咖啡工坊", capacity: 24,
  cashPrice: 99, pricingMode: "flat", feeCollectAt: "signup", checkinMode: "both", promoTemplate: "salon",
  promoModules: [
    { type: "cover", config: { title: "城市咖啡手作品鉴沙龙" }, sort: 1 },
    { type: "agenda", config: {}, sort: 2 },
    { type: "rewards", config: {}, sort: 3 },
  ],
  promoContact: { phone: "请填写真实电话", wechat: "请填写真实微信号" },
  formConfig: [
    { name: "name", label: "姓名", type: "text", required: true },
    { name: "phone", label: "手机号", type: "text", required: true },
  ],
  rewardConfig: { loginEnabled: false, selectMode: "all", rewards: [] },
  tags: ["咖啡", "沙龙"], assets: [{ url: "https://picsum.photos/seed/coffee/800/600" }],
};

const argv = process.argv.slice(2);
if (argv.includes("--file")) {
  // 用法: node scripts/test-import-contract.cjs --file _ai-payload.json
  const path = argv[argv.indexOf("--file") + 1];
  const fs = require("fs");
  const raw = fs.readFileSync(path, "utf8");
  const r = importActivity(raw, new Date());
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

console.log("T1 标准输出（无代码块）");
{
  const r = importActivity(JSON.stringify(GOOD), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    check("title/type", r.body.title === GOOD.title && r.body.type === "沙龙");
    check("startTime 换算", r.body.startTime === "2026-09-01T06:00:00.000Z", r.body.startTime); // +7d 14:00(本地) → UTC
    check("endTime=绝对给定", r.body.endTime === "2026-09-01T08:30:00.000Z", r.body.endTime);
    check("signupEnd=startTime", r.body.signupEnd === r.body.startTime);
    check("status=draft", r.body.status === "draft");
    check("promoModules 归一化排序", r.body.promoModules.map(m => m.type).join(",") === "cover,agenda,rewards", JSON.stringify(r.body.promoModules));
    check("rewardConfig 结构", r.body.rewardConfig.selectMode === "all" && Array.isArray(r.body.rewardConfig.rewards));
    check("formConfig 保留", r.body.formConfig.length === 2);
  }
}

console.log("T2 AI 带 ```json 代码块 + 前后解释文字");
{
  const raw = "好的，以下是生成的宣传数据：\n```json\n" + JSON.stringify(GOOD, null, 2) + "\n```\n希望对你有帮助！";
  const r = importActivity(raw, NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  check("解析成功且字段完整", r.ok && r.body.title === GOOD.title);
}

console.log("T3 多余未知字段 + 缺可选字段 → 忽略/补默认");
{
  const messy = { ...GOOD, signupAdvanceHours: 99, foo: "bar", lecturer: { name: "x" }, extra: [1,2,3] };
  const r = importActivity(JSON.stringify(messy), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  check("未知字段不入体", !("foo" in r.body) && !("lecturer" in r.body) && !("signupAdvanceHours" in r.body));
}

console.log("T4 缺必填 + 非法枚举 + 非法时间 → 阻断 + 字段级错误");
{
  const bad = { title: "x", type: "", description: "", startTime: "下周三", promoTemplate: "bogus", pricingMode: "free", capacity: 0 };
  const r = importActivity(JSON.stringify(bad), NOW);
  check("ok=false", !r.ok);
  check("错误含 title 长度", r.errors.some(e => e.includes("title")), JSON.stringify(r.errors));
  check("错误含 type", r.errors.some(e => e.startsWith("type")), JSON.stringify(r.errors));
  check("错误含 description", r.errors.some(e => e.startsWith("description")), JSON.stringify(r.errors));
  check("错误含 startTime 时间格式", r.errors.some(e => e.includes("startTime")), JSON.stringify(r.errors));
  check("错误含 promoTemplate 枚举", r.errors.some(e => e.includes("promoTemplate")), JSON.stringify(r.errors));
  check("错误含 pricingMode 枚举", r.errors.some(e => e.includes("pricingMode")), JSON.stringify(r.errors));
  check("错误含 capacity", r.errors.some(e => e.includes("capacity")), JSON.stringify(r.errors));
}

console.log("T5 缺 endTime/promoModules（startTime 必填）→ 其余默认换算");
{
  const minimal = { title: "周末读书会", type: "读书会", description: "共读一本好书", startTime: "+7d 09:00" };
  const r = importActivity(JSON.stringify(minimal), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    check("startTime 默认 +7d 09:00", r.body.startTime === "2026-09-01T01:00:00.000Z", r.body.startTime);
    check("endTime=start+3h", r.body.endTime === "2026-09-01T04:00:00.000Z", r.body.endTime);
    check("capacity 默认 100", r.body.capacity === 100);
    check("promoTemplate 默认 summit", r.body.promoTemplate === "summit");
    check("promoModules 默认 9 模块", r.body.promoModules.length === 9, "len=" + r.body.promoModules.length);
    check("promoContact 占位", r.body.promoContact.phone === "请填写真实电话");
    check("formConfig 默认姓名+手机号", r.body.formConfig.length === 2);
    check("rewardConfig 无奖励", r.body.rewardConfig.rewards.length === 0);
  }
}

console.log("T6 promoModules 非法 type 丢弃 + sort 冲突去重");
{
  const p = { ...GOOD, promoModules: [
    { type: "hack", config: {}, sort: 1 },
    { type: "cover", config: {}, sort: 2 },
    { type: "message", config: {}, sort: 3 },
    { type: "cover", config: {}, sort: 2 },   // 与已有 cover 同 sort → 丢弃（后端去重行为）
    { type: null, config: {}, sort: 5 },
  ] };
  const r = importActivity(JSON.stringify(p), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  check("非法 type 丢弃且保留合法", r.body.promoModules.map(m => m.type).join(",") === "cover,message", JSON.stringify(r.body.promoModules));
}

console.log("T7 rewardConfig 复杂奖励（multi + condition）保留");
{
  const p = { ...GOOD, rewardConfig: {
    loginEnabled: true, channel: { type: "contact", label: "留联系方式" }, selectMode: "any", selectN: 2,
    rewards: [
      { id: "r1", name: "伴手礼", type: "gift", mode: "single", condition: "none", config: {} },
      { id: "r2", name: "优惠券", type: "coupon", mode: "multi", condition: "survey", config: { amount: 20 } },
    ],
  } };
  const r = importActivity(JSON.stringify(p), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  check("multi+survey 保留", r.body.rewardConfig.rewards.length === 2 && r.body.rewardConfig.rewards[1].condition === "survey", JSON.stringify(r.body.rewardConfig.rewards));
  check("selectMode/selectN 保留", r.body.rewardConfig.selectMode === "any" && r.body.rewardConfig.selectN === 2);
}

console.log("T8 模拟外部 AI 按提示词模板产出新需求（带代码块+前后说明）");
{
  const aiRaw = [
    "好的，根据你的需求，我生成的活动宣传数据如下：",
    "```json",
    JSON.stringify({
      title: "秋季城市公益跑步节",
      type: "公益",
      category: "社会公益",
      description: "5 公里城市公益跑，报名费全额捐赠给乡村图书角项目。现场设有补给站、完赛奖牌与公益证书。",
      startTime: "+14d 08:00",
      endTime: "+14d 11:00",
      venueName: "滨江绿道公园",
      capacity: 300,
      cashPrice: 50,
      pricingMode: "flat",
      feeCollectAt: "signup",
      checkinMode: "both",
      promoTemplate: "action",
      promoModules: [
        { type: "cover", config: { title: "秋季城市公益跑步节", subtitle: "每一步都算数" }, sort: 1 },
        { type: "info", config: { venue: "滨江绿道公园", time: "+14d 08:00", capacity: 300, price: 50 }, sort: 2 },
        { type: "highlights", config: { items: ["5 公里城市跑", "完赛奖牌", "公益证书", "补给站"] }, sort: 3 },
        { type: "agenda", config: { items: [["08:00", "签到领物"], ["08:30", "热身"], ["09:00", "开跑"], ["10:30", "颁奖与合影"]] }, sort: 4 },
        { type: "rewards", config: {}, sort: 5 },
        { type: "faq", config: { items: [{ q: "完赛有奖牌吗？", a: "有，完赛即发定制奖牌" }] }, sort: 6 },
        { type: "contact", config: {}, sort: 7 },
        { type: "message", config: { enabled: true }, sort: 8 },
      ],
      promoContact: { phone: "请填写真实电话", wechat: "请填写真实微信号", note: "请运营替换为真实联系方式" },
      formConfig: [
        { name: "name", label: "姓名", type: "text", required: true, placeholder: "请输入姓名" },
        { name: "phone", label: "手机号", type: "text", required: true, placeholder: "请输入手机号" },
        { name: "shoeSize", label: "鞋码", type: "text", required: false, placeholder: "选填，用于赛事包" },
      ],
      rewardConfig: { loginEnabled: false, selectMode: "all", rewards: [] },
      tags: ["公益", "跑步", "城市"],
      assets: [{ url: "https://picsum.photos/seed/run/800/600" }],
    }, null, 2),
    "```",
    "请查收，运营可在后台草稿中核对后发布。",
  ].join("\n");
  const r = importActivity(aiRaw, NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    check("title/type", r.body.title === "秋季城市公益跑步节" && r.body.type === "公益");
    check("startTime +14d 08:00 换算", r.body.startTime === "2026-09-08T00:00:00.000Z", r.body.startTime);
    check("promoTemplate=action", r.body.promoTemplate === "action");
    check("promoModules 8 个保留", r.body.promoModules.length === 8, "len=" + r.body.promoModules.length);
    check("formConfig 3 个字段保留", r.body.formConfig.length === 3);
    check("tags/assets 保留", r.body.tags.length === 3 && r.body.assets.length === 1);
  }
}

console.log("T9 模块 config 标准化：highlights items→points / agenda 二维数组→对象 / speakers items 丢弃");
{
  const p = { ...GOOD, promoModules: [
    { type: "cover", config: { title: "欢乐亲子趣味体验工坊", subtitle: "陪伴成长" }, sort: 1 },
    { type: "highlights", config: { items: ["趣味亲子闯关游戏", "创意手工 DIY 制作"] }, sort: 2 },
    { type: "agenda", config: { items: [["09:30", "签到入场", "领取物料包"], ["10:20", "亲子手工 DIY"]] }, sort: 3 },
    { type: "speakers", config: { items: [{ name: "李老师", desc: "儿童早教指导师" }] }, sort: 4 },
  ] };
  const r = importActivity(JSON.stringify(p), NOW);
  check("ok", r.ok, JSON.stringify(r.errors));
  if (r.ok) {
    const byType = Object.fromEntries(r.body.promoModules.map(m => [m.type, m.config]));
    check("highlights items→points", Array.isArray(byType.highlights.points) && byType.highlights.points.length === 2 && !("items" in byType.highlights), JSON.stringify(byType.highlights));
    check("agenda 二维数组→对象", byType.agenda.items[0].t === "09:30" && byType.agenda.items[0].title === "签到入场" && byType.agenda.items[0].desc === "领取物料包", JSON.stringify(byType.agenda));
    check("agenda 对象数组透传", byType.agenda.items[1].title === "亲子手工 DIY");
    check("speakers items 丢弃", !("items" in byType.speakers), JSON.stringify(byType.speakers));
    check("cover config 透传", byType.cover.title === "欢乐亲子趣味体验工坊");
  }
}

console.log("\n结果: " + pass + " 通过, " + fail + " 失败");
if (fail) process.exit(1);
module.exports = { importActivity };
