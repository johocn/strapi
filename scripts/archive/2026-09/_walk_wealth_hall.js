const { chromium } = require("playwright");

const START = "https://v.joho.cn/wealth/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  try {
    // ===== 1. 登录 =====
    await page.goto(START, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    const inputs = page.locator("input");
    await inputs.nth(0).fill("etao");
    await inputs.nth(1).fill("__PASSWORD__");
    await page.locator("uni-button.login-btn").first().tap();
    let landed = false;
    for (let i = 0; i < 40; i++) {
      await sleep(1500);
      if (page.url().includes("v.joho.cn/wealth")) { landed = true; break; }
      const agree = page.locator("uni-button", { hasText: /同意|授权|确认|允许/ });
      if (await agree.count() > 0) await agree.first().tap();
    }
    log("login", landed ? "OK" : "FAIL");
    await page.waitForTimeout(6000);

    // ===== 2. 首页：顶部提示 =====
    const homeTop = await page.evaluate(() => document.body.innerText.slice(0, 400));
    log("homeTop", JSON.stringify(homeTop));
    const hasUpdateTip = /数据更新至|更新至|截至|数据积累中/.test(await page.evaluate(() => document.body.innerText));
    log("updateTip", hasUpdateTip ? "FOUND" : "MISS");

    // ===== 3. 首页：排序下拉 =====
    const sortLabel = page.locator("text=最近更新").first();
    log("sortDefaultVisible", await sortLabel.count());
    await page.evaluate(() => {
      const els = [...document.querySelectorAll("*")];
      const el = els.find((e) => e.children.length === 0 && /排序[:：]?\s*最近更新/.test(e.textContent || ""));
      if (el) { (el.closest("uni-picker") || el.closest("picker") || el.parentElement).click(); }
    });
    await sleep(1500);
    const sortOpts = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".uni-picker-item, .picker-item, uni-picker-item, [class*=picker] li, [class*=option]")];
      return items.map((i) => (i.innerText || "").trim()).filter(Boolean).slice(0, 12);
    });
    log("sortOptions", JSON.stringify(sortOpts));
    const bodyAfterSort = await page.evaluate(() => document.body.innerText.slice(0, 300));
    log("bodyAfterSort", JSON.stringify(bodyAfterSort));

    // ===== 4. 首页：类型筛选（货币理财） =====
    await page.evaluate(() => {
      const els = [...document.querySelectorAll("*")];
      const el = els.find((e) => e.children.length === 0 && /全部类型/.test(e.textContent || ""));
      if (el) { (el.closest("uni-picker") || el.closest("picker") || el.parentElement).click(); }
    });
    await sleep(1500);
    const typeOpts = await page.evaluate(() => {
      const items = [...document.querySelectorAll(".uni-picker-item, .picker-item, uni-picker-item, [class*=picker] li, [class*=option]")];
      return items.map((i) => (i.innerText || "").trim()).filter(Boolean).slice(0, 12);
    });
    log("typeOptions", JSON.stringify(typeOpts));

    // 尝试选中「货币理财」：模拟 picker 项点击
    const moneyOpt = page.locator("uni-picker-item", { hasText: "货币理财" }).first();
    const moneyCnt = await moneyOpt.count().catch(() => 0);
    log("moneyPickerItem", moneyCnt);
    if (moneyCnt > 0) {
      await moneyOpt.tap();
      await sleep(3000);
      const afterFilter = await page.evaluate(() => document.body.innerText);
      const moneyCount = (afterFilter.match(/货币理财/g) || []).length;
      const bankCount = (afterFilter.match(/银行理财/g) || []).length;
      log("afterMoneyFilter", JSON.stringify({ money: moneyCount, bank: bankCount, snippet: afterFilter.slice(0, 500) }));
    }

    await page.screenshot({ path: "e:/code/basic/scripts/_walk_hall_filtered.png" });
    log("shot", "hall filtered saved");
  } catch (e) {
    console.log("ERR:", e.message.slice(0, 400));
    try { await page.screenshot({ path: "e:/code/basic/scripts/_walk_err.png" }); } catch {}
  }
  await browser.close();
})();
