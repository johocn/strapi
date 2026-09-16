const { chromium } = require("playwright");

const DOC_ID = "ga-main-000000001";
const BASE = "https://h.joho.cn";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);

  try {
    // 1) 登录
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

    // 2) 打开编辑页，等待表单加载
    await page.goto(`${BASE}/#/pages/website/geo-article/edit?documentId=${DOC_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(9000);

    // 3) 检查段落绑定区块是否存在及行数
    const rowCount = await page.locator(".section-bind-row").count();
    log("bindRows", rowCount);
    if (rowCount === 0) { log("result", "SKIP: 无已选真值声明，无法验证绑定 UI"); await browser.close(); return; }

    const firstClaim = await page.locator(".section-bind-row").first().locator(".section-bind-claim").innerText();
    log("firstClaim", firstClaim);

    // 4) 打开第一行的 picker 并选「结语」（第 2 项）
    const picker = page.locator(".section-bind-row").first().locator("uni-picker");
    await picker.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const box = await picker.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1500);

    const items = page.locator(".uni-picker-item:visible");
    const itemCount = await items.count();
    log("pickerVisibleItems", itemCount);
    const itemTexts = [];
    for (let i = 0; i < itemCount; i++) itemTexts.push((await items.nth(i).innerText()).trim());
    log("itemTexts", JSON.stringify(itemTexts));

    // 点可见项第 2 项「结语」
    await items.nth(1).tap();
    await page.waitForTimeout(1500);

    // 5) 校验回显（uni-app H5 编译后 text→uni-text，用 .picker-value 首行文本）
    const echoed = await page.locator(".section-bind-row").first().locator(".picker-value").first().innerText().catch(e => "ERR:" + e.message.slice(0, 80));
    log("echoAfterSelect", echoed);

    // 6) 存草稿（toast 出现后 600ms 会 navigateBack，需快速抓取）
    await page.locator(".btn-secondary").tap();
    let savedToast = false;
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(300);
      const bodyAfterSave = await page.evaluate(() => document.body.innerText);
      if (bodyAfterSave.includes("已保存")) { savedToast = true; break; }
    }
    log("saveToast", savedToast ? "OK(已保存)" : "MISS");
    log("backTo", page.url());

    // 7) 重新打开页面，验证绑定持久化
    await page.goto(`${BASE}/#/pages/website/geo-article/edit?documentId=${DOC_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(9000);
    const rowCount2 = await page.locator(".section-bind-row").count();
    const echoed2 = rowCount2 > 0 ? await page.locator(".section-bind-row").first().locator(".picker-value").first().innerText() : "(none)";
    log("persistRows", rowCount2);
    log("persistEcho", echoed2);
    log("result", savedToast && echoed2.includes("结语") ? "PASS" : "CHECK");
  } catch (e) {
    console.log("ERR:", e.message);
  }
  await browser.close();
})();
