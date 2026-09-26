/* 优美惠市集「迎中秋庆国庆」促销宣传页落库（幂等：按 title 查重，命中即更新）
 * 用法: cd e:\code\basic && node scripts/seed-youmeihui-festival-promo.cjs
 * 可选环境变量:
 *   API_BASE        默认 http://127.0.0.1:1337/api
 *   ZHAO_IDENTIFIER 默认 1117（本地测试账号）
 *   ZHAO_PASSWORD   默认 a123456
 *   COVER_URL       封面/分享底图地址，缺省则封面不带底图
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:1337/api";
const IDENTIFIER = process.env.ZHAO_IDENTIFIER || "1117";
const PASSWORD = process.env.ZHAO_PASSWORD || "a123456";
const COVER_URL = process.env.COVER_URL || "";

const TITLE = "免费领西瓜｜优美惠双节钜惠";

const DESCRIPTION =
  "10.1—10.8 双节同庆｜长春双阳优美惠市集生鲜超市。进店免费领西瓜 1/4 份，" +
  "农夫山泉 1×12 群友价 8.8，1800克心相印 15.9，崂山、青岛小优、燕京啤酒群友价 25。";

const PROMO_MODULES = [
  {
    type: "cover",
    sort: 1,
    config: {
      title: "中秋好礼相送 · 国庆钜惠狂欢",
      subtitle: "10.1—10.8 双节同庆 · 进店免费领西瓜",
      ...(COVER_URL ? { bgImage: COVER_URL } : {}),
    },
  },
  {
    type: "goods",
    sort: 2,
    config: { title: "群友价 · 双节钜惠", notice: "群友价需出示本页面，限购数量以门店为准" },
  },
  {
    type: "highlights",
    sort: 3,
    config: {
      title: "进店免费领",
      points: ["1/4 份西瓜免费领", "无需消费，到店即可", "每日限量，先到先得"],
    },
  },
  { type: "purpose", sort: 4, config: { title: "我们为什么这么做" } },
  {
    type: "notice",
    sort: 5,
    config: {
      title: "活动说明",
      html: "<p>每人限领 1 份</p><p>不与其他优惠叠加</p><p>数量有限，送完为止</p>",
    },
  },
  {
    type: "highlights",
    sort: 6,
    config: {
      title: "免费招商 · 10.1—12.31",
      points: ["10.1—12.31 免费招商", "生鲜、熟食、小吃、日用等品类均可", "招商电话 18514363399"],
    },
  },
  { type: "info", sort: 7, config: {} },
  { type: "contact", sort: 8, config: {} },
  { type: "floatContact", sort: 9, config: {} },
];

const PAYLOAD = {
  title: TITLE,
  type: "促销",
  category: "生鲜超市",
  description: DESCRIPTION,
  startTime: "2026-10-01T00:00:00+08:00",
  endTime: "2026-10-08T23:59:59+08:00",
  venueName: "优美惠市集生鲜超市",
  lat: 43.635025,
  lng: 125.583775,
  status: "ongoing",
  promoTemplate: "sale",
  promoColors: {
    primary: "#EF4444",
    accent: "#F97316",
    bg: "#FFF7F5",
    card: "#FFF1EE",
    text: "#1F2937",
    textDim: "#6B7280",
  },
  promoAssets: COVER_URL ? [{ name: "双节主视觉", url: COVER_URL, scene: "cover" }] : [],
  promoContact: {
    phone: "18514363399",
    notice: "招商合作、团购批发请致电",
    wechat: { id: "", qrcode: "" },
  },
  purpose: "扎根双阳，邻里超市。做有人情味的产品，开最有人情味的超市。",
  // 原价与单位用户未提供，一律留空，页面只显示群友价
  goodsList: [
    { name: "农夫山泉 1×12", promoPrice: 8.8, unit: "" },
    { name: "心相印 1800克", promoPrice: 15.9, unit: "" },
    { name: "崂山啤酒", promoPrice: 25, unit: "" },
    { name: "青岛小优", promoPrice: 25, unit: "" },
    { name: "燕京啤酒", promoPrice: 25, unit: "" },
  ],
  promoModules: PROMO_MODULES,
};

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
  const login = await api("POST", "/zhao-auth/v1/login", {
    body: { identifier: IDENTIFIER, password: PASSWORD },
  });
  if (login.status !== 200 || !login.json?.jwt) {
    throw new Error("获取管理端 token 失败: " + JSON.stringify(login.json));
  }
  const token = login.json.jwt;

  // 幂等：按 title 精确匹配已有记录（列表接口一次取 200 条，本场景足够）
  const listed = await api("GET", "/zhao-point/v1/admin/adm/activities?page=1&pageSize=200", { token });
  if (listed.status !== 200) {
    throw new Error("查询活动列表失败: " + JSON.stringify(listed.json));
  }
  const rows = listed.json?.list || listed.json?.data || [];
  const exist = rows.find((x) => (x?.title || x?.attributes?.title) === TITLE);

  if (exist) {
    const docId = exist.documentId || exist.attributes?.documentId;
    const updated = await api("PUT", `/zhao-point/v1/admin/adm/activities/${docId}`, { token, body: PAYLOAD });
    if (updated.status < 200 || updated.status >= 300) {
      throw new Error("更新活动失败: " + JSON.stringify(updated.json));
    }
    const d = updated.json?.data || updated.json;
    console.log("✔ 已更新既有活动:", d?.documentId || docId);
    console.log("  宣传页: /pages/activity/promo?act=" + (d?.documentId || docId));
    return;
  }

  const created = await api("POST", "/zhao-point/v1/admin/adm/activities", { token, body: PAYLOAD });
  if (created.status < 200 || created.status >= 300) {
    throw new Error("创建活动失败: " + JSON.stringify(created.json));
  }
  const d = created.json?.data || created.json;
  console.log("✔ 已创建活动:", d?.documentId || d?.id);
  console.log("  宣传页: /pages/activity/promo?act=" + (d?.documentId || d?.id));
  if (!COVER_URL) console.log("  注意: 未带封面图（COVER_URL 为空）");
}

main().catch((e) => { console.error("❌ 落库脚本失败:", e.message); process.exit(1); });