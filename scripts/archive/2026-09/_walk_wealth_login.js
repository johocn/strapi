const { chromium } = require("playwright");

const START = "https://v.joho.cn/wealth/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const log = (k, v) => console.log(`${k}: ${v}`);

  try {
    // 1) 打开财富端 → 自动跳 SSO 登录页
    await page.goto(START, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    log("loginPageUrl", page.url());
    const body0 = await page.evaluate(() => document.body.innerText.slice(0, 200));
    log("loginPageText", JSON.stringify(body0));

    // 2) 输入账号密码（uni-app H5 登录表单）
    const inputs = page.locator("input");
    const n = await inputs.count();
    log("inputCount", n);
    await inputs.nth(0).fill("etao");
    await inputs.nth(1).fill("__PASSWORD__");
    await page.waitForTimeout(500);
    const btn = page.locator("uni-button.login-btn");
    const btnCnt = await btn.count();
    log("loginBtn", btnCnt);
    if (btnCnt > 0) {
      await btn.first().tap();
    } else {
      const anyBtn = page.locator("uni-button").first();
      log("fallbackBtnText", await anyBtn.innerText().catch(() => "?"));
      await anyBtn.tap();
    }

    // 3) 等待回跳财富端（可能经过 SSO 授权页）
    let landed = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1500);
      const u = page.url();
      if (u.includes("v.joho.cn/wealth")) { landed = true; log("landedAt", u); break; }
      const b = await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(() => "");
      if (i % 5 === 0) log(`step${i}`, u.slice(0, 120) + " | " + JSON.stringify(b.slice(0, 80)));
      // SSO 授权确认页：找「同意/授权」按钮
      const agree = page.locator("uni-button", { hasText: /同意|授权|确认|允许/ });
      if (await agree.count() > 0) {
        log("agreeBtnFound", await agree.first().innerText().catch(() => "?"));
        await agree.first().tap();
      }
    }
    log("landed", landed);

    // 4) 等待首页数据加载，提取内容
    await page.waitForTimeout(6000);
    const body = await page.evaluate(() => document.body.innerText);
    log("homeText", JSON.stringify(body.slice(0, 1500)));
    const urlNow = page.url();
    log("finalUrl", urlNow);

    await page.screenshot({ path: "e:/code/basic/scripts/_walk_wealth_home.png", fullPage: false });
    log("shot", "home saved");
  } catch (e) {
    console.log("ERR:", e.message.slice(0, 300));
    try { await page.screenshot({ path: "e:/code/basic/scripts/_walk_wealth_err.png" }); } catch {}
  }
  await browser.close();
})();
