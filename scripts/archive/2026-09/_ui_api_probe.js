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
    let loggedIn = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1200);
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("当前租户")) { loggedIn = true; break; }
    }
    log("login", loggedIn ? "OK" : "FAIL");

    // 直接 fetch detail API，看服务端返回的 truthBasisSections 与 truthBasis claimKey
    const apiInfo = await page.evaluate(async (docId) => {
      const headers = {};
      const token = localStorage.getItem("tadmin_token") || uni?.getStorageSync?.("tadmin_token") || "";
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/zhao-website/v1/admin/geo-articles/${docId}`, { headers });
      const json = await res.json();
      const item = json.data || json;
      const sections = item.truthBasisSections || [];
      const basis = (item.truthBasis || []).map(t => ({ id: t.id, claimKey: t.claimKey, claim: (t.claim || "").slice(0, 30) }));
      return {
        status: res.status,
        sectionsCount: sections.length,
        sections,
        basis,
      };
    }, DOC_ID);
    log("apiStatus", apiInfo.status);
    log("apiSectionsCount", apiInfo.sectionsCount);
    log("apiSections", JSON.stringify(apiInfo.sections));
    log("apiBasis", JSON.stringify(apiInfo.basis));
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
