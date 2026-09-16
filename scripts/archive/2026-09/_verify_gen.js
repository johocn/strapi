// 验证运营端四个列表 API 返回数据：AI 摘要 / 知识实体 / 知识关系 / 第一真值
const { chromium } = require("playwright");

const BASE = "https://h.joho.cn";
const API = "/api/zhao-website/v1/admin";

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
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("当前租户")) { loggedIn = true; break; }
    }
    console.log(`login: ${loggedIn ? "OK" : "FAIL"}`);
    if (!loggedIn) { await browser.close(); return; }

    const token = await page.evaluate(() => localStorage.getItem("tadmin_token") || "");
    const tenant = await page.evaluate(() => localStorage.getItem("tadmin_current_tenant_id") || "");
    console.log(`tenant: ${tenant}`);

    const checks = [
      ["AI 摘要", `${API}/ai-summaries?pagination[page]=1&pagination[pageSize]=10`],
      ["知识实体", `${API}/knowledge-graph/entities?page=1&pageSize=20`],
      ["知识关系", `${API}/knowledge-graph/relations?page=1&pageSize=20`],
      ["第一真值", `${API}/first-truths?pagination[page]=1&pagination[pageSize]=10`],
    ];

    for (const [name, url] of checks) {
      const r = await page.evaluate(async ({ url, token, tenant }) => {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (tenant) headers["x-site-id"] = String(tenant);
        const res = await fetch(url, { headers });
        let count = -1;
        try {
          const json = await res.json();
          const list = Array.isArray(json) ? json : (json.data || json.results || json.rows);
          count = Array.isArray(list) ? list.length : 0;
        } catch {}
        return { status: res.status, count };
      }, { url, token, tenant });
      console.log(`${name}: status=${r.status} count=${r.count}`);
    }
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
