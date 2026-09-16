const { chromium } = require("playwright");

const DOC_ID = "ga-main-000000001";
const BASE = "https://h.joho.cn";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);

  // 捕获 PUT /geo-articles 请求体
  let captured = null;
  page.on("request", (req) => {
    if (req.method() === "PUT" && req.url().includes("/geo-articles/")) {
      captured = { url: req.url(), postData: req.postData() };
    }
  });
  let putResponse = null;
  page.on("response", async (res) => {
    if (res.request().method() === "PUT" && res.request().url().includes("/geo-articles/")) {
      let body = "";
      try { body = await res.text(); } catch (e) { body = "(no body)"; }
      putResponse = { status: res.status(), body: body.slice(0, 800) };
    }
  });

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

    await page.goto(`${BASE}/#/pages/website/geo-article/edit?documentId=${DOC_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(9000);

    // 记录第一行初始回显
    const initialEcho = await page.locator(".section-bind-row").first().locator(".picker-value").first().innerText();
    log("initialEchoRow1", JSON.stringify(initialEcho));

    // 打开第一行 picker，选「结语」
    const picker = page.locator(".section-bind-row").first().locator("uni-picker");
    await picker.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const box = await picker.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1500);
    const items = page.locator(".uni-picker-item:visible");
    await items.nth(1).tap();
    await page.waitForTimeout(1200);

    const afterEcho = await page.locator(".section-bind-row").first().locator(".picker-value").first().innerText();
    log("afterSelectRow1", JSON.stringify(afterEcho));

    // 存草稿
    await page.locator(".btn-secondary").tap();
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(300);
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes("已保存")) break;
    }
    await page.waitForTimeout(1200);
    log("capturedPut", captured ? JSON.stringify({ url: captured.url, postData: (captured.postData || "").slice(0, 600) }) : "(none)");
    log("putResponse", putResponse ? JSON.stringify(putResponse) : "(none)");
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
