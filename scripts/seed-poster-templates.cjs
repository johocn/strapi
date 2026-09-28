/* 海报模板落库到 zhao-studio（幂等：按 code 查重，命中即全量更新（模板字段 + 元素重建））
 * 覆盖两个模板：
 *   - promo_share    促销活动分享海报（C 端 pages/activity/promo 使用）
 *   - activity_share 活动分享海报（C 端 pages/activity/detail 使用）
 * 用法:
 *   cd e:\code\basic
 *   node scripts/seed-poster-templates.cjs                                    # 本地
 *   API_BASE=https://h.joho.cn/api ZHAO_IDENTIFIER=zhao ZHAO_PASSWORD=a963963 node scripts/seed-poster-templates.cjs  # 生产
 */
const API_BASE = process.env.API_BASE || "http://127.0.0.1:1337/api";
const IDENTIFIER = process.env.ZHAO_IDENTIFIER || "1117";
const PASSWORD = process.env.ZHAO_PASSWORD || "a123456";

const GRADIENT = "#gradient:EF4444,F97316";

// ============ promo_share ============
const PROMO_SHARE = {
  template: {
    name: "促销活动海报",
    code: "promo_share",
    canvasWidth: 600,
    canvasHeight: 1050,
    backgroundColor: "#FFFFFF",
    backgroundMode: "cover",
    isActive: true,
    isDefault: false,
    requiredVariables: ["title", "main_image", "qr_code"],
    optionalVariables: ["activity_start", "activity_end", "activity_venue", "goods_1", "goods_2", "goods_3", "goods_4", "goods_category_1", "goods_category_2", "goods_category_3", "goods_category_4", "main_push", "image_fallback_slogan", "image_fallback_sign", "image_fallback_primary", "image_fallback_accent"],
    description: "促销活动分享海报（C 端 pages/activity/promo 使用）",
  },
  elements: [
    { elementKey: "gradient_bar", elementName: "顶部渐变条", elementType: "shape", shapeType: "rect", isVariable: false, x: 0, y: 0, width: 600, height: 6, elementBgColor: GRADIENT, zIndex: 1, sortOrder: 1 },
    { elementKey: "main_image", elementName: "主视觉图", elementType: "image", isVariable: true, variableName: "main_image", defaultValue: "", x: 30, y: 40, width: 540, height: 404, imageFit: "cover", borderRadius: 12, zIndex: 2, sortOrder: 2 },
    { elementKey: "title", elementName: "活动标题", elementType: "text", isVariable: true, variableName: "title", defaultValue: "活动钜惠", x: 30, y: 460, width: 540, height: 44, fontSize: 34, fontColor: "#1F2937", fontWeight: "bold", textAlign: "left", lineHeight: 1.2, zIndex: 10, sortOrder: 3 },
    { elementKey: "activity_start", elementName: "活动开始时间", elementType: "text", isVariable: true, variableName: "activity_start", defaultValue: "", x: 30, y: 512, width: 540, height: 28, fontSize: 24, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 4 },
    { elementKey: "activity_end", elementName: "活动结束时间", elementType: "text", isVariable: true, variableName: "activity_end", defaultValue: "", x: 30, y: 544, width: 540, height: 28, fontSize: 24, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 5 },
    { elementKey: "activity_venue", elementName: "活动场所", elementType: "text", isVariable: true, variableName: "activity_venue", defaultValue: "", x: 30, y: 580, width: 540, height: 28, fontSize: 24, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 6 },
    { elementKey: "category_chip_1", elementName: "品类chip1", elementType: "text", isVariable: true, variableName: "goods_category_1", defaultValue: "", x: 30, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 7 },
    { elementKey: "category_chip_2", elementName: "品类chip2", elementType: "text", isVariable: true, variableName: "goods_category_2", defaultValue: "", x: 168, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 8 },
    { elementKey: "category_chip_3", elementName: "品类chip3", elementType: "text", isVariable: true, variableName: "goods_category_3", defaultValue: "", x: 306, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 9 },
    { elementKey: "category_chip_4", elementName: "品类chip4", elementType: "text", isVariable: true, variableName: "goods_category_4", defaultValue: "", x: 444, y: 614, width: 126, height: 32, fontSize: 18, fontColor: "#C2410C", textAlign: "center", lineHeight: 1.4, elementBgColor: "#FDECE3", borderRadius: 16, zIndex: 10, sortOrder: 10 },
    { elementKey: "main_push", elementName: "主推横条", elementType: "text", isVariable: true, variableName: "main_push", defaultValue: "", x: 30, y: 652, width: 540, height: 44, fontSize: 22, fontColor: "#7C2D12", textAlign: "center", lineHeight: 1.5, elementBgColor: "#FDECE3", borderRadius: 8, zIndex: 10, sortOrder: 11 },
    { elementKey: "goods_1", elementName: "商品行1", elementType: "text", isVariable: true, variableName: "goods_1", defaultValue: "", x: 30, y: 702, width: 540, height: 26, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 12 },
    { elementKey: "goods_2", elementName: "商品行2", elementType: "text", isVariable: true, variableName: "goods_2", defaultValue: "", x: 30, y: 730, width: 540, height: 26, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 13 },
    { elementKey: "goods_3", elementName: "商品行3", elementType: "text", isVariable: true, variableName: "goods_3", defaultValue: "", x: 30, y: 758, width: 540, height: 26, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 14 },
    { elementKey: "goods_4", elementName: "商品行4", elementType: "text", isVariable: true, variableName: "goods_4", defaultValue: "", x: 30, y: 786, width: 540, height: 26, fontSize: 22, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 15 },
    { elementKey: "qr_code", elementName: "分享二维码", elementType: "qrcode", isVariable: true, variableName: "qr_code", qrContentMode: "direct", qrErrorLevel: "M", qrSize: 170, qrColor: "#000000", qrBgColor: "#FFFFFF", x: 215, y: 820, width: 170, height: 170, zIndex: 10, sortOrder: 16 },
    { elementKey: "footer_text", elementName: "底部提示", elementType: "text", isVariable: false, content: "长按识别二维码 · 查看活动详情", x: 30, y: 996, width: 540, height: 30, fontSize: 22, fontColor: "#9CA3AF", textAlign: "center", lineHeight: 1.5, zIndex: 10, sortOrder: 17 },
  ],
};

// ============ activity_share（日期两行，与 C 端内置模板逐值一致）============
const ACTIVITY_SHARE = {
  template: {
    name: "活动分享海报",
    code: "activity_share",
    canvasWidth: 600,
    canvasHeight: 1000,
    backgroundColor: "#FFFFFF",
    backgroundMode: "cover",
    isActive: true,
    isDefault: false,
    requiredVariables: ["title", "qr_code"],
    optionalVariables: ["activity_start", "activity_end", "activity_venue", "invite_code"],
    description: "活动分享海报（C 端 pages/activity/detail 使用）",
  },
  elements: [
    { elementKey: "gradient_bar", elementName: "顶部渐变条", elementType: "shape", shapeType: "rect", isVariable: false, x: 0, y: 0, width: 600, height: 6, elementBgColor: "#gradient:667eea,764ba2", zIndex: 1, sortOrder: 1 },
    { elementKey: "title", elementName: "活动标题", elementType: "text", isVariable: true, variableName: "title", defaultValue: "精品线下活动", x: 30, y: 150, width: 540, height: 60, fontSize: 36, fontColor: "#333333", fontWeight: "bold", textAlign: "left", lineHeight: 1.4, zIndex: 10, sortOrder: 3 },
    { elementKey: "activity_start", elementName: "活动开始时间", elementType: "text", isVariable: true, variableName: "activity_start", defaultValue: "", x: 30, y: 238, width: 540, height: 36, fontSize: 26, fontColor: "#1F2937", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 4 },
    { elementKey: "activity_end", elementName: "活动结束时间", elementType: "text", isVariable: true, variableName: "activity_end", defaultValue: "", x: 30, y: 280, width: 540, height: 36, fontSize: 26, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 5 },
    { elementKey: "activity_venue", elementName: "活动场所", elementType: "text", isVariable: true, variableName: "activity_venue", defaultValue: "", x: 30, y: 332, width: 540, height: 36, fontSize: 26, fontColor: "#6B7280", textAlign: "left", lineHeight: 1.5, zIndex: 10, sortOrder: 6 },
    { elementKey: "main_info_badge", elementName: "扫码报名标签", elementType: "text", isVariable: false, content: "扫码报名", x: 225, y: 422, width: 150, height: 44, fontSize: 24, fontColor: "#FFFFFF", fontWeight: "bold", textAlign: "center", elementBgColor: "#667eea", borderRadius: 8, zIndex: 10, sortOrder: 7 },
    { elementKey: "qr_code", elementName: "分享二维码", elementType: "qrcode", isVariable: false, qrContentMode: "url_with_invite", qrBaseUrl: "https://v.joho.cn/share", qrInviteParam: "inviteCode", qrInviteSeparator: "?", qrFallbackMode: "base_url_only", qrSize: 200, x: 200, y: 512, width: 200, height: 200, zIndex: 10, sortOrder: 8 },
    { elementKey: "footer_text", elementName: "底部提示", elementType: "text", isVariable: false, content: "名额有限 · 扫码报名参加", x: 30, y: 752, width: 540, height: 30, fontSize: 24, fontColor: "#999999", textAlign: "center", lineHeight: 1.5, zIndex: 10, sortOrder: 9 },
  ],
};

const TEMPLATES = [PROMO_SHARE, ACTIVITY_SHARE];

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

async function saveElements(docId, token, elements) {
  const saved = await api("PUT", `/zhao-studio/v1/admin/poster-templates/${docId}/elements`, {
    token,
    body: { elements },
  });
  if (saved.status >= 200 && saved.status < 300) {
    console.log(`✔ 元素已写入: ${elements.length} 个（批量接口）`);
    return;
  }

  // 兜底：生产仍跑旧版 batchSaveElements（relation 过滤用了 documentId 会 500），改用逐元素创建
  console.warn("⚠ 批量写入失败，回退逐元素创建:", saved.status, JSON.stringify(saved.json).slice(0, 200));
  for (const el of elements) {
    const one = await api("POST", "/zhao-studio/v1/admin/poster-elements", {
      token,
      body: { data: { ...el, posterTemplate: docId } },
    });
    if (one.status < 200 || one.status >= 300) {
      throw new Error(`写入元素 ${el.elementKey} 失败: ` + JSON.stringify(one.json).slice(0, 300));
    }
  }
  console.log(`✔ 元素已写入: ${elements.length} 个（逐元素接口）`);
}

async function upsert({ template, elements }, token) {
  const CODE = template.code;
  const listed = await api("GET", "/zhao-studio/v1/admin/poster-templates", { token });
  if (listed.status !== 200) throw new Error("查询海报模板失败: " + JSON.stringify(listed.json));
  const rows = listed.json?.data || listed.json || [];
  const exist = Array.isArray(rows) ? rows.find((t) => t.code === CODE) : null;

  let docId = exist?.documentId;
  if (exist) {
    const upd = await api("PUT", `/zhao-studio/v1/admin/poster-templates/${docId}`, {
      token,
      body: { data: template },
    });
    if (upd.status < 200 || upd.status >= 300) {
      throw new Error("更新模板失败: " + JSON.stringify(upd.json).slice(0, 300));
    }
    console.log(`✔ 模板 ${CODE} 已更新（documentId=${docId}，元素 ${(exist.elements || []).length} 个 → 全量重建）`);
  } else {
    // site 关系必填：取首个 site-config（服务端 seed 同款做法）
    const sites = await api("GET", "/zhao-common/v1/admin/config/sites", { token });
    const siteRows = sites.json?.data || sites.json || [];
    const siteId = Array.isArray(siteRows) ? (siteRows[0]?.documentId || siteRows[0]?.id) : null;
    if (!siteId) throw new Error("未取到 site documentId: " + JSON.stringify(sites.json).slice(0, 300));

    const created = await api("POST", "/zhao-studio/v1/admin/poster-templates", {
      token,
      body: { data: { ...template, site: siteId } },
    });
    if (created.status < 200 || created.status >= 300) throw new Error("创建模板失败: " + JSON.stringify(created.json));
    docId = created.json?.data?.documentId || created.json?.documentId;
    console.log("✔ 模板已创建:", CODE, "documentId =", docId);
  }

  await saveElements(docId, token, elements);
}

async function main() {
  const login = await api("POST", "/zhao-auth/v1/login", { body: { identifier: IDENTIFIER, password: PASSWORD } });
  if (login.status !== 200 || !login.json?.jwt) throw new Error("获取管理端 token 失败: " + JSON.stringify(login.json));
  const token = login.json.jwt;

  for (const t of TEMPLATES) await upsert(t, token);
}

main().catch((e) => { console.error("❌ 海报模板落库失败:", e.message); process.exit(1); });