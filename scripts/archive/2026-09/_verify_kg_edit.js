// 验证知识关系编辑页：API 过滤 + 浏览器表单回显
const { chromium } = require("playwright");
const BASE = "https://h.joho.cn";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();

  try {
    await page.goto(`${BASE}/#/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill("__ADMIN_PASSWORD__");
    await page.locator("uni-button.login-btn").click();
    let loggedIn = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      if ((await page.evaluate(() => document.body.innerText)).includes("当前租户")) { loggedIn = true; break; }
    }
    console.log(`login: ${loggedIn ? "OK" : "FAIL"}`);

    const token = await page.evaluate(() => localStorage.getItem("tadmin_token") || "");
    const tenant = await page.evaluate(() => localStorage.getItem("tadmin_current_tenant_id") || "");

    // 1) API 层：filters[documentId] 过滤
    const api = await page.evaluate(async ({ token, tenant }) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (tenant) headers["x-site-id"] = tenant;
      const res = await fetch(`/api/zhao-website/v1/admin/knowledge-graph/relations?filters[documentId]=kgr-provides-00000001`, { headers });
      const json = await res.json();
      return { status: res.status, count: Array.isArray(json) ? json.length : (json.data || []).length, first: Array.isArray(json) ? json[0] : null };
    }, { token, tenant });
    console.log(`API status=${api.status} count=${api.count}`);
    if (api.first) {
      console.log(`  documentId=${api.first.documentId} predicate=${api.first.predicate}`);
      console.log(`  subjectEntity=${api.first.subjectEntity?.name}(${api.first.subjectEntity?.documentId})`);
      console.log(`  objectEntity=${api.first.objectEntity?.name}(${api.first.objectEntity?.documentId})`);
    }

    // 2) UI 层：编辑页表单回显
    await page.goto(`${BASE}/#/pages/website/knowledge-relation/edit?documentId=kgr-provides-00000001`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    const vals = await page.evaluate(() => {
      const ins = Array.from(document.querySelectorAll("input")).map((i) => i.value);
      return { inputs: ins, text: document.body.innerText.replace(/\s+/g, " ").slice(0, 200) };
    });
    console.log(`\nUI 表单输入值: ${JSON.stringify(vals.inputs)}`);
    console.log(`UI 页面文本: ${vals.text}`);
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
