const { chromium } = require("playwright");

const DOC_ID = "ga-main-000000001";
const BASE = "https://h.joho.cn";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);

  try {
    await page.goto(`${BASE}/#/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("admin");
    await inputs.nth(1).fill("__ADMIN_PASSWORD__");
    await page.locator("uni-button.login-btn").click();
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("当前租户")) break;
    }

    // 测试 A：包装 {data} 方式 PUT metaTitle 标记
    const resA = await page.evaluate(async (docId) => {
      const token = localStorage.getItem("tadmin_token") || "";
      const mark = `TEST-${Date.now()}`;
      const r = await fetch(`/api/zhao-website/v1/admin/geo-articles/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-site-id": localStorage.getItem("tadmin_current_tenant_id") || "" },
        body: JSON.stringify({ data: { metaTitle: mark } }),
      });
      const json = await r.json().catch(() => ({}));
      return { status: r.status, mark, respMetaTitle: json.metaTitle, data: json.data?.metaTitle };
    }, DOC_ID);
    log("testA_wrapped", JSON.stringify(resA));

    // 测试 B：裸 payload 方式 PUT metaTitle 标记
    const resB = await page.evaluate(async (docId) => {
      const token = localStorage.getItem("tadmin_token") || "";
      const mark = `TESTB-${Date.now()}`;
      const r = await fetch(`/api/zhao-website/v1/admin/geo-articles/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-site-id": localStorage.getItem("tadmin_current_tenant_id") || "" },
        body: JSON.stringify({ metaTitle: mark }),
      });
      const json = await r.json().catch(() => ({}));
      return { status: r.status, mark, respMetaTitle: json.metaTitle, data: json.data?.metaTitle };
    }, DOC_ID);
    log("testB_raw", JSON.stringify(resB));
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
